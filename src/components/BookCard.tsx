import React from 'react';
import { Book } from '../types';
import { CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const BookCard: React.FC<{ book: Book, isList?: boolean }> = ({ book, isList }) => {
  const isCompleted = book.progress === 100;

  return (
    <Link 
      to={`/reading/${book.id}`}
      className={`bg-surface rounded-xl border border-primary/10 shadow-premium overflow-hidden group transition-all hover:shadow-ambient ${isList ? 'flex flex-row h-24' : 'flex flex-col h-full'}`}
    >
      <div className={`${isList ? 'w-16 flex-shrink-0 relative overflow-hidden bg-surface-variant' : 'aspect-[2/3] relative overflow-hidden bg-surface-variant'}`}>
        {book.coverUrl ? (
          <img 
            src={book.coverUrl} 
            alt={book.title}
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${book.accentColor || 'from-surface-variant to-outline-variant'} flex items-center justify-center p-2 text-center`}>
            <span className={`${isList ? 'text-[10px]' : 'text-xl'} text-white font-bold opacity-90 line-clamp-3`}>{book.title}</span>
          </div>
        )}
        
        {!isList && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-surface/90 backdrop-blur-sm rounded-lg border border-outline-variant/30">
            <span className="text-[10px] font-bold text-on-surface">{book.format}</span>
          </div>
        )}

        {isCompleted && !isList && (
          <div className="absolute bottom-2 right-2 w-8 h-8 bg-surface rounded-full flex items-center justify-center shadow-sm">
            <CheckCircle2 className="text-primary w-5 h-5 fill-primary text-white" />
          </div>
        )}
      </div>

      <div className={`p-4 flex flex-col flex-1 min-w-0 ${isList ? 'justify-between' : ''}`}>
        <div>
          <h3 className="text-sm font-bold text-on-surface mb-1 line-clamp-1">{book.title}</h3>
          <p className="text-xs text-on-surface-variant mb-4">{book.author}</p>
        </div>
        
        <div className={`mt-auto ${isList ? 'flex flex-col' : ''}`}>
          <div className="flex justify-between items-end mb-2">
            <span className="text-[10px] font-bold text-primary flex items-center gap-1">
              阅读进度: {book.progress}%
              {isCompleted && <CheckCircle2 size={12} className="fill-primary" />}
            </span>
            <span className="text-[10px] text-outline font-normal">{book.lastRead}</span>
          </div>
          <div className="h-1 w-full bg-surface-variant rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all" 
              style={{ width: `${book.progress}%` }} 
            />
          </div>
        </div>
      </div>
    </Link>
  );
};

export const FeaturedBookCard: React.FC<{ book: Book, isList?: boolean }> = ({ book, isList }) => {
  return (
    <Link
      to={`/reading/${book.id}`}
      className={`bg-surface rounded-xl border border-primary/10 shadow-premium overflow-hidden group flex transition-all hover:shadow-ambient ${isList ? 'h-32 flex-row' : 'col-span-2 md:col-span-2 row-span-2 sm:flex-row flex-col h-full'}`}
    >
      <div className={`${isList ? 'w-24 flex-shrink-0 relative overflow-hidden bg-surface-variant' : 'w-full sm:w-2/5 aspect-[2/3] sm:aspect-auto sm:h-full relative overflow-hidden bg-surface-variant'}`}>
        {book.coverUrl ? (
          <img 
            src={book.coverUrl} 
            alt={book.title}
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${book.accentColor || 'from-surface-variant to-outline-variant'} flex items-center justify-center p-6 text-center`}>
            <span className="text-xl text-white font-bold opacity-90">{book.title}</span>
          </div>
        )}
        {!isList && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
            <button className="w-full py-2 bg-white/20 backdrop-blur-md text-white rounded-lg text-xs font-bold">继续阅读</button>
          </div>
        )}
      </div>
      
      <div className={`flex flex-col justify-between flex-1 bg-gradient-to-b from-white to-surface-variant/10 min-w-0 ${isList ? 'p-4' : 'p-6'}`}>
        <div className="min-w-0">
          <div className={`inline-flex items-center gap-1 px-2 py-1 bg-secondary-container text-on-secondary-container rounded-full ${isList ? 'mb-2' : 'mb-3'}`}>
            <span className="text-[10px] font-bold tracking-wider">正在阅读</span>
          </div>
          <h3 className={`font-bold text-on-surface line-clamp-2 ${isList ? 'text-lg mb-1' : 'text-xl mb-2'}`}>{book.title}</h3>
          {!isList && <p className="text-sm text-on-surface-variant mb-4">{book.author}</p>}
          {!isList && <p className="text-xs text-on-surface-variant line-clamp-3 mb-6 hidden sm:block italic leading-relaxed">
            {book.description}
          </p>}
        </div>

        <div>
          <div className="flex justify-between items-end mb-2">
            <span className="text-xs font-bold text-primary">阅读进度: {book.progress}%</span>
            <span className="text-xs text-outline font-normal line-clamp-1">{book.lastRead}</span>
          </div>
          <div className="h-1.5 w-full bg-surface-variant rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all" 
              style={{ width: `${book.progress}%` }} 
            />
          </div>
        </div>
      </div>
    </Link>
  );
};

