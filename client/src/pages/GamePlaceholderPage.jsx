import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Gamepad2, Sparkles } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';

export const GamePlaceholderPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  const title = (slug || 'Mini-Game')
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <Card className="p-8 sm:p-12 border-cyan-500/30 bg-slate-900/90 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto mb-6">
          <Gamepad2 className="w-8 h-8" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 mb-4">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Game Engine Synchronizing</span>
        </div>
        <h1 className="text-3xl font-bold font-heading text-white mb-3">{title}</h1>
        <p className="text-sm text-slate-300 mb-8 max-w-md mx-auto">
          This arena module is currently queueing for release in the build sequence.
        </p>
        <Button variant="primary" icon={ArrowLeft} onClick={() => navigate('/dashboard')}>
          Back to Game Arena
        </Button>
      </Card>
    </div>
  );
};

export default GamePlaceholderPage;
