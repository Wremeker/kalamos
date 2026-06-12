import React, { useRef, useEffect, useState } from 'react';

interface TitleInputProps {
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  onArrowDown?: () => void;
  placeholder?: string;
}

export const TitleInput: React.FC<TitleInputProps> = ({
  value,
  onChange,
  onEnter,
  onArrowDown,
  placeholder = 'Untitled',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isInitialRender, setIsInitialRender] = useState(true);

  useEffect(() => {
    if (inputRef.current && isInitialRender && value) {
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.scrollLeft = 0;
          inputRef.current.setSelectionRange(0, 0);
          setIsInitialRender(false);
        }
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [value, isInitialRender]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.scrollLeft = 0;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (onEnter) {
        onEnter();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      if (onArrowDown) {
        onArrowDown();
      }
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      placeholder={placeholder}
      className="w-full max-w-full text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black outline-none border-none bg-transparent text-[#293241] dark:text-zinc-100 placeholder-[#68BBFE] dark:placeholder-zinc-600"
      style={{ textOverflow: 'clip' }}
    />
  );
};

