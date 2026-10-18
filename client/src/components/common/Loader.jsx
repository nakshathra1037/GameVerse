import React from 'react';
import LoadingSpinner from './LoadingSpinner';

export const Loader = ({ text = 'Loading...', size = 'md', fullScreen = false }) => {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07090e]/80 backdrop-blur-md">
        <LoadingSpinner size={size} text={text} />
      </div>
    );
  }

  return <LoadingSpinner size={size} text={text} />;
};

export default Loader;
