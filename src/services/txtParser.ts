import jschardet from 'jschardet';
import { Book, Chapter } from '../types';

export interface TxtQualityReport {
  encoding: string;
  hasBom: boolean;
  hasNullBytes: boolean;
  suspiciousChars: number;
  mojibakeRisk: boolean;
  lineBreakMixed: boolean;
  chapterPatternConfidence: number;
  warnings: string[];
}

export interface ParseResult {
  book: Book;
  report: TxtQualityReport;
}

/**
 * 彻底处理 TXT 解析：预检查、清洗、鲁棒识别
 */
export async function parseTxtFile(file: File): Promise<Book> {
  const result = await parseTxtFileWithReport(file);
  return result.book;
}

export async function parseTxtFileWithReport(file: File): Promise<ParseResult> {
  // 1. 预检查与编码检测
  const sampleSize = Math.min(file.size, 1024 * 1024); // 采样 1MB
  const sampleBuffer = await file.slice(0, sampleSize).arrayBuffer();
  const uint8 = new Uint8Array(sampleBuffer);
  
  const report: TxtQualityReport = {
    encoding: 'utf-8',
    hasBom: uint8[0] === 0xEF && uint8[1] === 0xBB && uint8[2] === 0xBF,
    hasNullBytes: uint8.includes(0x00),
    suspiciousChars: 0,
    mojibakeRisk: false,
    lineBreakMixed: false,
    chapterPatternConfidence: 0,
    warnings: []
  };

  // 检测换行符混合
  let hasCR = false;
  let hasLF = false;
  for (let i = 0; i < Math.min(uint8.length, 10000); i++) {
    if (uint8[i] === 0x0D) hasCR = true;
    if (uint8[i] === 0x0A) hasLF = true;
  }
  report.lineBreakMixed = hasCR && hasLF;

  // 编码检测
  let binaryString = '';
  for (let i = 0; i < Math.min(uint8.length, 10000); i++) {
    binaryString += String.fromCharCode(uint8[i]);
  }
  const detection = jschardet.detect(binaryString);
  let encoding = detection.encoding || 'utf-8';
  
  // 修正回退
  if (encoding.toLowerCase() === 'ascii') encoding = 'utf-8';
  const supportedEncodings = ['utf-8', 'gbk', 'gb18030', 'utf-16le', 'utf-16be', 'big5'];
  if (!supportedEncodings.includes(encoding.toLowerCase())) {
    encoding = 'utf-8';
    report.warnings.push('未能精确识别编码，已回退至 UTF-8');
    report.mojibakeRisk = true;
  }
  report.encoding = encoding;

  // 2. 流式加载与预处理清洗
  const chapters: Chapter[] = [];
  const CHUNK_SIZE = 1024 * 1024;
  let offset = 0;
  let accumulatedText = '';
  const decoder = new TextDecoder(encoding, { fatal: false });
  
  // 稳健的章节识别正则
  // 支持：第...章/卷/节/回, Chapter, 序号(1. / 1、), 序章/楔子/番外/终章/后记
  const chapterRegex = /(?:^|\n)\s*(第\s*[一二三四五六七八九十百千万零0-9A-Za-z]+\s*[章节卷回]|Chapter\s*[0-9A-Za-z]+|序[章言]|前言|楔子|番外|终章|结局|后记|结语|^\s*[0-9]+[\.\、\s].*)\s*(?:\n|$)/gi;

  let introText = '';
  let foundAnyChapter = false;

  while (offset < file.size) {
    const chunk = await file.slice(offset, offset + CHUNK_SIZE).arrayBuffer();
    let text = decoder.decode(chunk, { stream: true });

    // --- 文本清洗优化层 ---
    text = text
      .replace(/\uFEFF/g, '')     // 去掉 BOM
      .replace(/\x00/g, '')       // 去掉 NUL
      .replace(/\r\n/g, '\n')     // 统一换行
      .replace(/\r/g, '\n')
      .replace(/[\x01-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, ''); // 清理异常控制字符
    
    accumulatedText += text;

    // 分章逻辑
    const lastNewlineIdx = accumulatedText.lastIndexOf('\n');
    if (lastNewlineIdx === -1 && offset + CHUNK_SIZE < file.size) {
      offset += CHUNK_SIZE;
      continue;
    }

    const processingText = accumulatedText.substring(0, lastNewlineIdx + 1);
    accumulatedText = accumulatedText.substring(lastNewlineIdx + 1);

    chapterRegex.lastIndex = 0;
    let match;
    let lastMatchEnd = 0;

    while ((match = chapterRegex.exec(processingText)) !== null) {
      foundAnyChapter = true;
      const contentBefore = processingText.substring(lastMatchEnd, match.index).trim();
      const currentTitle = match[1].trim();
      
      if (chapters.length === 0) {
        introText += contentBefore;
      } else {
        chapters[chapters.length - 1].content += '\n' + contentBefore;
      }

      chapters.push({
        id: `ch-${chapters.length + 1}`,
        title: currentTitle,
        page: chapters.length + 1,
        progress: 0,
        content: ''
      });
      
      lastMatchEnd = match.index + match[0].length;
    }

    if (chapters.length > 0) {
      chapters[chapters.length - 1].content += '\n' + processingText.substring(lastMatchEnd).trim();
    } else {
      introText += processingText.substring(lastMatchEnd);
    }

    offset += CHUNK_SIZE;
  }

  // 扫尾
  if (accumulatedText) {
    if (chapters.length > 0) {
      chapters[chapters.length - 1].content += '\n' + accumulatedText;
    } else {
      introText += accumulatedText;
    }
  }

  // 3. 结果精化与去重 (第二步)
  const seenTitles = new Map<string, number>(); // titleNorm -> chapterIndex
  const chaptersToKeep = new Set<number>();
  
  // 从后往前扫描，保留内容最丰富的那个版本（通常正文在后，目录在前）
  for (let i = chapters.length - 1; i >= 0; i--) {
    const ch = chapters[i];
    const titleNorm = ch.title.replace(/\s+/g, '');
    
    if (seenTitles.has(titleNorm)) {
      const existingIdx = seenTitles.get(titleNorm)!;
      const existingCh = chapters[existingIdx];
      
      // 如果发现重复，保留内容更长的那个
      if (ch.content.length > existingCh.content.length) {
         chaptersToKeep.delete(existingIdx);
         chaptersToKeep.add(i);
         seenTitles.set(titleNorm, i);
      }
    } else {
      chaptersToKeep.add(i);
      seenTitles.set(titleNorm, i);
    }
  }

  let filteredChapters = chapters.filter((_, idx) => chaptersToKeep.has(idx));

  // 处理前导文作为第一章
  if (introText.trim().length > 0) {
    filteredChapters.unshift({
      id: 'chapter-intro',
      title: '序言',
      page: 0,
      progress: 0,
      content: introText.trim()
    });
  }

  // 二次精化：过滤掉疑似目录的极短章节
  filteredChapters = filteredChapters.filter((ch, idx) => {
    // 过滤掉完全没内容的
    if (ch.content.trim().length === 0) return false;
    
    // 如果不是最后一章，且内容过短（< 100字），且之后还有内容很接近的章节
    if (idx < filteredChapters.length - 1) {
      const nextCh = filteredChapters[idx + 1];
      const currentTitleNorm = ch.title.replace(/\s+/g, '');
      const nextTitleNorm = nextCh.title.replace(/\s+/g, '');
      
      // 内容极少且标题重复（模糊匹配）
      if (ch.content.length < 200 && (nextTitleNorm.includes(currentTitleNorm) || currentTitleNorm.includes(nextTitleNorm))) {
         return false;
      }
      
      // 如果在书头（前20章）出现连续过短章节，极大概率是目录残余
      if (idx < 20 && ch.content.length < 50 && nextCh.content.length < 50) {
         return false;
      }
    }
    return true;
  });

  // 重新分配 ID 和页码
  filteredChapters = filteredChapters.map((ch, idx) => ({
    ...ch,
    id: `ch-${idx + 1}`,
    page: idx + 1
  }));

  // 兜底逻辑：如果识别章节过少，按安全规则切块
  if (!foundAnyChapter || filteredChapters.length < 2) {
    const fullContent = filteredChapters.length > 0 
      ? filteredChapters.map(c => c.content).join('\n') 
      : (chapters.map(c => c.content).join('\n') || introText);
      
    if (fullContent.length > 5000) {
      // 自动切块：约 2000 字一大段
      filteredChapters.length = 0;
      const BLOCK_SIZE = 2000;
      for (let i = 0; i < fullContent.length; i += BLOCK_SIZE) {
        filteredChapters.push({
          id: `block-${filteredChapters.length + 1}`,
          title: `正文 - 第 ${filteredChapters.length + 1} 部分`,
          page: filteredChapters.length + 1,
          progress: 0,
          content: fullContent.substring(i, i + BLOCK_SIZE).trim()
        });
      }
      report.warnings.push('未检测到明显章节结构，已自动按篇幅切块');
    } else {
      filteredChapters.length = 0;
      filteredChapters.push({
        id: 'full',
        title: '正文',
        page: 1,
        progress: 0,
        content: fullContent.trim()
      });
    }
  }

  // 计算置信度
  report.chapterPatternConfidence = Math.min(filteredChapters.length / 5, 1);
  if (report.hasNullBytes) report.warnings.push('发现 NUL 字符，已执行自动修复');
  if (report.lineBreakMixed) report.warnings.push('发现换行符格式混合，已执行标准化处理');

  return {
    book: {
      id: `local-${Date.now()}`,
      title: file.name.replace(/\.txt$/i, ''),
      author: '本地导入',
      coverUrl: '',
      progress: 0,
      lastRead: new Date().toLocaleDateString(),
      format: 'TXT',
      chapters: filteredChapters.filter(c => c.content.length > 0)
    },
    report
  };
}
