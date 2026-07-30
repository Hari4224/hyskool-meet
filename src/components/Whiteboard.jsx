import React, { useRef, useState, useEffect } from 'react';
import { 
  Pencil, Square, Circle, Minus, Eraser, Trash2, Download, Upload, ZoomIn, ZoomOut 
} from 'lucide-react';

export default function Whiteboard({ socket, roomId, initialElements = [] }) {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState('pen'); // pen, rect, circle, line, eraser
  const [color, setColor] = useState('#38bdf8');
  const [brushSize, setBrushSize] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [elements, setElements] = useState(initialElements);

  const colors = ['#38bdf8', '#a855f7', '#ec4899', '#34d399', '#fbbf24', '#ffffff', '#0f172a'];

  useEffect(() => {
    redrawCanvas();
  }, [elements]);

  useEffect(() => {
    if (!socket) return;

    socket.on('whiteboard-draw', (newElement) => {
      setElements(prev => [...prev, newElement]);
    });

    socket.on('whiteboard-clear', () => {
      setElements([]);
    });

    return () => {
      socket.off('whiteboard-draw');
      socket.off('whiteboard-clear');
    };
  }, [socket]);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    elements.forEach(el => {
      ctx.strokeStyle = el.color;
      ctx.lineWidth = el.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (el.tool === 'pen' || el.tool === 'eraser') {
        if (el.tool === 'eraser') {
          ctx.strokeStyle = '#ffffff';
        }
        ctx.beginPath();
        el.points.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
      } else if (el.tool === 'rect') {
        ctx.beginPath();
        ctx.strokeRect(el.x, el.y, el.w, el.h);
      } else if (el.tool === 'circle') {
        ctx.beginPath();
        const radius = Math.sqrt(el.w * el.w + el.h * el.h);
        ctx.arc(el.x, el.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (el.tool === 'line') {
        ctx.beginPath();
        ctx.moveTo(el.x1, el.y1);
        ctx.lineTo(el.x2, el.y2);
        ctx.stroke();
      }
    });
  };

  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setStartPos({ x, y });

    if (tool === 'pen' || tool === 'eraser') {
      const newEl = {
        id: Date.now(),
        tool,
        color,
        size: brushSize,
        points: [{ x, y }]
      };
      setElements(prev => [...prev, newEl]);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === 'pen' || tool === 'eraser') {
      setElements(prev => {
        const lastIdx = prev.length - 1;
        if (lastIdx < 0) return prev;
        const updated = [...prev];
        updated[lastIdx].points.push({ x, y });
        return updated;
      });
    }
  };

  const handleMouseUp = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let finalEl = null;
    if (tool === 'rect') {
      finalEl = {
        id: Date.now(),
        tool: 'rect',
        color,
        size: brushSize,
        x: startPos.x,
        y: startPos.y,
        w: x - startPos.x,
        h: y - startPos.y
      };
    } else if (tool === 'circle') {
      finalEl = {
        id: Date.now(),
        tool: 'circle',
        color,
        size: brushSize,
        x: startPos.x,
        y: startPos.y,
        w: x - startPos.x,
        h: y - startPos.y
      };
    } else if (tool === 'line') {
      finalEl = {
        id: Date.now(),
        tool: 'line',
        color,
        size: brushSize,
        x1: startPos.x,
        y1: startPos.y,
        x2: x,
        y2: y
      };
    } else if (tool === 'pen' || tool === 'eraser') {
      finalEl = elements[elements.length - 1];
    }

    if (finalEl) {
      if (tool !== 'pen' && tool !== 'eraser') {
        setElements(prev => [...prev, finalEl]);
      }
      if (socket) {
        socket.emit('whiteboard-draw', finalEl);
      }
    }
  };

  const handleClear = () => {
    setElements([]);
    if (socket) socket.emit('whiteboard-clear');
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `hyskool-whiteboard-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const handleTouchStart = (e) => {
    if (e.touches && e.touches[0]) {
      const touch = e.touches[0];
      handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches && e.touches[0]) {
      const touch = e.touches[0];
      handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
    }
  };

  const handleTouchEnd = (e) => {
    handleMouseUp(e);
  };

  return (
    <div className="whiteboard-container">
      {/* Toolbar */}
      <div className="whiteboard-toolbar">
        <button className={`btn btn-secondary ${tool === 'pen' ? 'btn-primary' : ''}`} onClick={() => setTool('pen')}>
          <Pencil size={16} /> Pen
        </button>
        <button className={`btn btn-secondary ${tool === 'rect' ? 'btn-primary' : ''}`} onClick={() => setTool('rect')}>
          <Square size={16} /> Rect
        </button>
        <button className={`btn btn-secondary ${tool === 'circle' ? 'btn-primary' : ''}`} onClick={() => setTool('circle')}>
          <Circle size={16} /> Circle
        </button>
        <button className={`btn btn-secondary ${tool === 'line' ? 'btn-primary' : ''}`} onClick={() => setTool('line')}>
          <Minus size={16} /> Line
        </button>
        <button className={`btn btn-secondary ${tool === 'eraser' ? 'btn-primary' : ''}`} onClick={() => setTool('eraser')}>
          <Eraser size={16} /> Eraser
        </button>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 12 }}>
          {colors.map(c => (
            <div 
              key={c}
              className={`color-swatch ${color === c ? 'selected' : ''}`}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={handleClear}>
            <Trash2 size={16} color="#f43f5e" /> Clear
          </button>
          <button className="btn btn-secondary" onClick={handleDownload}>
            <Download size={16} /> Export Image
          </button>
        </div>
      </div>

      {/* Canvas */}
      <canvas 
        ref={canvasRef}
        width={900}
        height={600}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: tool === 'eraser' ? 'cell' : 'crosshair', background: '#ffffff', width: '100%', height: '100%', touchAction: 'none' }}
      />
    </div>
  );
}
