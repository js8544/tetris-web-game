import type { Annotation } from 'agentation';
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { BOARD_HEIGHT, BOARD_WIDTH } from './game/constants';
import {
  advanceGame,
  composeRenderBoard,
  createInitialGame,
  getPieceStyles,
  getPreviewMatrix,
  hardDrop,
  movePiece,
  rotateCurrent,
} from './game/utils';
import type { GameState } from './game/types';

const STORAGE_KEY = 'tetris-high-score';
const projectId = import.meta.env.VITE_CONSEN_PROJECT_ID ?? 'prj_01kp7njnewfm6bbzdaew554ydd';
const taskId = import.meta.env.VITE_CONSEN_TASK_ID ?? 'tsk_01kp7nmabtfyb93dshv7zwahmx';
const chatId = import.meta.env.VITE_CONSEN_CHAT_ID ?? 'chat_01kp7nentvedfr6q52d1p00f1h';
const workspaceId = import.meta.env.VITE_CONSEN_WORKSPACE_ID ?? 'ws_01kf0b8vzse7rb8tf8s2r1sgxj';
const webhookUrl = import.meta.env.VITE_AGENTATION_WEBHOOK_URL ?? 'https://api.consen.app/webhooks/agentation';

const AgentationOverlay = lazy(async () => {
  const module = await import('agentation');
  return { default: module.Agentation };
});

function readHighScore(): number {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  const parsed = Number(saved);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function App() {
  const [game, setGame] = useState<GameState>(() => createInitialGame(readHighScore()));
  const [agentationStatus, setAgentationStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(game.highScore));
  }, [game.highScore]);

  const startGame = useCallback(() => {
    setGame((previous) => createInitialGame(previous.highScore, 'playing'));
  }, []);

  const restartGame = useCallback(() => {
    setGame((previous) => createInitialGame(previous.highScore, 'playing'));
  }, []);

  const togglePause = useCallback(() => {
    setGame((previous) => {
      if (previous.status === 'playing') {
        return { ...previous, status: 'paused' };
      }
      if (previous.status === 'paused') {
        return { ...previous, status: 'playing' };
      }
      return previous;
    });
  }, []);

  useEffect(() => {
    if (game.status !== 'playing') {
      return undefined;
    }
    const timer = window.setInterval(() => {
      setGame((previous) => advanceGame(previous));
    }, game.dropInterval);
    return () => window.clearInterval(timer);
  }, [game.dropInterval, game.status]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' ', 'Escape'].includes(event.key)) {
        event.preventDefault();
      }

      if (event.key === 'Enter' && (game.status === 'idle' || game.status === 'over')) {
        startGame();
        return;
      }

      if (event.key.toLowerCase() === 'r') {
        restartGame();
        return;
      }

      if (event.key.toLowerCase() === 'p' || event.key === 'Escape') {
        togglePause();
        return;
      }

      if (game.status !== 'playing') {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
          setGame((previous) => movePiece(previous, -1, 0));
          break;
        case 'ArrowRight':
          setGame((previous) => movePiece(previous, 1, 0));
          break;
        case 'ArrowDown':
          setGame((previous) => movePiece(previous, 0, 1, true));
          break;
        case 'ArrowUp':
        case 'x':
        case 'X':
          setGame((previous) => rotateCurrent(previous));
          break;
        case ' ':
          setGame((previous) => hardDrop(previous));
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [game.status, restartGame, startGame, togglePause]);

  const renderBoard = useMemo(() => composeRenderBoard(game.board, game.current), [game.board, game.current]);
  const previewMatrix = useMemo(() => getPreviewMatrix(game.nextType), [game.nextType]);

  const handleSubmitFeedback = useCallback(async (output: string, annotations: Annotation[]) => {
    setAgentationStatus('sending');
    try {
      const payload = {
        event: 'submit',
        timestamp: Date.now(),
        url: window.location.href,
        output,
        annotations,
        project_id: projectId,
        task_id: taskId,
        chat_id: chatId,
        workspace_id: workspaceId,
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        keepalive: true,
      });

      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}`);
      }
      setAgentationStatus('sent');
      window.setTimeout(() => setAgentationStatus('idle'), 2800);
    } catch (error) {
      console.error('Agentation submit failed', error);
      setAgentationStatus('error');
    }
  }, []);

  const statusLabel = {
    idle: '等待开始',
    playing: '进行中',
    paused: '已暂停',
    over: '游戏结束',
  }[game.status];

  const remainder = game.lines % 10;
  const linesToNextLevel = remainder === 0 ? 10 : 10 - remainder;

  return (
    <>
      <div className="app-shell">
        <div className="ambient ambient--one" />
        <div className="ambient ambient--two" />
        <main className="game-layout">
          <section className="hero-card">
            <p className="eyebrow">Railway Delivery Build</p>
            <h1>霓虹俄罗斯方块</h1>
            <p className="hero-copy">
              完整 UI、键盘操控、暂停/继续、等级加速、下一块预览、游戏结束态与 Agentation 反馈入口都已内置。
            </p>
            <div className="hero-actions">
              <button className="primary-btn" onClick={game.status === 'paused' ? togglePause : startGame}>
                {game.status === 'idle' && '开始游戏'}
                {game.status === 'paused' && '继续游戏'}
                {game.status === 'playing' && '重新开局'}
                {game.status === 'over' && '再来一局'}
              </button>
              <button className="secondary-btn" onClick={restartGame}>
                重开
              </button>
            </div>
            <div className="status-pills">
              <span className={`pill pill--${game.status}`}>{statusLabel}</span>
              <span className="pill pill--subtle">桌面键盘优先</span>
              <span className="pill pill--subtle">Agentation 已接入</span>
            </div>
          </section>

          <section className="board-card" aria-label="俄罗斯方块棋盘">
            <div className="board-frame">
              <div
                className={`board-grid board-grid--${game.status}`}
                style={{
                  gridTemplateColumns: `repeat(${BOARD_WIDTH}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${BOARD_HEIGHT}, minmax(0, 1fr))`,
                }}
              >
                {renderBoard.flatMap((row, rowIndex) =>
                  row.map((cell, colIndex) => {
                    const key = `${rowIndex}-${colIndex}`;
                    const pieceType = cell.type;
                    const classes = ['cell'];
                    if (pieceType) {
                      classes.push('cell--filled');
                      classes.push(`cell--${pieceType.toLowerCase()}`);
                    }
                    if (cell.ghost) {
                      classes.push('cell--ghost');
                    }

                    return (
                      <div
                        key={key}
                        className={classes.join(' ')}
                        style={pieceType ? getPieceStyles(pieceType) : undefined}
                      />
                    );
                  }),
                )}
              </div>

              {game.status === 'idle' && (
                <div className="board-overlay">
                  <h2>准备开始</h2>
                  <p>按 Enter 或点击“开始游戏”，用方向键操控方块，空格直接硬降。</p>
                </div>
              )}

              {game.status === 'paused' && (
                <div className="board-overlay board-overlay--paused">
                  <h2>游戏暂停</h2>
                  <p>按 P / Esc 或点击继续，返回战局。</p>
                </div>
              )}

              {game.status === 'over' && (
                <div className="board-overlay board-overlay--over">
                  <h2>堆顶了</h2>
                  <p>本局得分 {game.score}。按 Enter 或“再来一局”重新开始。</p>
                </div>
              )}
            </div>
          </section>

          <aside className="side-panel">
            <section className="panel stats-panel">
              <h3>战局数据</h3>
              <div className="stats-grid">
                <article>
                  <span>得分</span>
                  <strong>{game.score}</strong>
                </article>
                <article>
                  <span>最高分</span>
                  <strong>{game.highScore}</strong>
                </article>
                <article>
                  <span>等级</span>
                  <strong>{game.level + 1}</strong>
                </article>
                <article>
                  <span>消行</span>
                  <strong>{game.lines}</strong>
                </article>
              </div>
              <div className="progress-meta">
                <span>距离下一等级还差 {linesToNextLevel} 行</span>
                <span>当前下落间隔 {game.dropInterval}ms</span>
              </div>
            </section>

            <section className="panel preview-panel">
              <div className="panel-header">
                <h3>下一块</h3>
                <span className="panel-tag">Preview</span>
              </div>
              <div className="preview-grid" style={{ gridTemplateColumns: `repeat(${previewMatrix[0].length}, 1fr)` }}>
                {previewMatrix.flatMap((row, rowIndex) =>
                  row.map((value, colIndex) => (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className={`preview-cell ${value ? `preview-cell--${game.nextType.toLowerCase()}` : ''}`}
                      style={value ? getPieceStyles(game.nextType) : undefined}
                    />
                  )),
                )}
              </div>
            </section>

            <section className="panel control-panel">
              <div className="panel-header">
                <h3>操作说明</h3>
                <span className="panel-tag">Keyboard</span>
              </div>
              <ul>
                <li><kbd>←</kbd> / <kbd>→</kbd> 左右移动</li>
                <li><kbd>↑</kbd> 旋转方块</li>
                <li><kbd>↓</kbd> 软降</li>
                <li><kbd>Space</kbd> 硬降到底</li>
                <li><kbd>P</kbd> / <kbd>Esc</kbd> 暂停继续</li>
                <li><kbd>R</kbd> 立即重开</li>
              </ul>
            </section>

            <section className="panel feedback-panel">
              <div className="panel-header">
                <h3>反馈链路</h3>
                <span className="panel-tag">Agentation</span>
              </div>
              <p>
                右下角可直接标注界面并提交反馈，已绑定 Consen Agentation webhook。
              </p>
              <div className={`feedback-status feedback-status--${agentationStatus}`}> 
                {agentationStatus === 'idle' && '等待反馈提交'}
                {agentationStatus === 'sending' && '正在发送反馈…'}
                {agentationStatus === 'sent' && '反馈已提交到 Consen'}
                {agentationStatus === 'error' && '反馈发送失败，请重试'}
              </div>
            </section>
          </aside>
        </main>
      </div>

      <Suspense fallback={null}>
        <AgentationOverlay
          onSubmit={handleSubmitFeedback}
          onAnnotationAdd={() => setAgentationStatus('idle')}
          copyToClipboard
        />
      </Suspense>
    </>
  );
}

export default App;
