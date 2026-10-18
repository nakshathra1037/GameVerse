import React from 'react';
import { Link } from 'react-router-dom';
import { Gamepad2, ArrowLeft } from 'lucide-react';
import Button from '../components/common/Button';

export const NotFound = () => {
  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-20 h-20 rounded-3xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-6 shadow-xl shadow-cyan-500/10">
        <Gamepad2 className="w-10 h-10" />
      </div>
      <h1 className="text-6xl font-black text-white font-heading tracking-wider mb-2">
        404
      </h1>
      <h2 className="text-xl font-bold text-slate-200 mb-4 font-heading">
        Sector Out of Bounds
      </h2>
      <p className="text-slate-400 max-w-md text-sm mb-8">
        The arena sector you are trying to warp into does not exist in GameVerse.
      </p>
      <Link to="/">
        <Button variant="primary" icon={ArrowLeft}>
          Return to Arena Home
        </Button>
      </Link>
    </div>
  );
};

export default NotFound;
