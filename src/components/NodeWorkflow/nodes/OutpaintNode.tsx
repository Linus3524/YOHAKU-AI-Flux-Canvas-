import React from 'react';
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react';
import type { OutpaintParams } from '../types';
import { useNodeStatusRing } from './useNodeStatusRing';
import { NodeResultPreview } from './NodeResultPreview';
import { NodeDeleteButton } from './NodeDeleteButton';
import { Icon } from '../../Icon';

const RATIOS: Array<OutpaintParams['aspectRatio']> = ['1:1', '4:3', '3:4', '16:9', '9:16', 'custom'];

export function OutpaintNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  const ring = useNodeStatusRing(id);
  const params = (data?.params ?? {}) as Partial<OutpaintParams & { isCollapsed?: boolean }>;
  
  // 多選方向狀態解析
  const activeDirs = Array.isArray(params.directions) ? params.directions : [params.direction || 'all'];
  const hasLeft = activeDirs.includes('left') || activeDirs.includes('all');
  const hasRight = activeDirs.includes('right') || activeDirs.includes('all');
  const hasTop = activeDirs.includes('top') || activeDirs.includes('all');
  const hasBottom = activeDirs.includes('bottom') || activeDirs.includes('all');
  const hasAll = activeDirs.includes('all');

  const aspectRatio = params.aspectRatio ?? '1:1';
  const pixelOffset = params.pixelOffset ?? 256;
  const isCollapsed = !!params.isCollapsed;

  const onDeleteNode = data?.onDeleteNode;
  const handleDelete = typeof onDeleteNode === 'function'
    ? () => (onDeleteNode as (nodeId: string) => void)(id)
    : undefined;

  const setParams = (patch: Partial<OutpaintParams & { isCollapsed?: boolean }>) => {
    updateNodeData(id, { params: { ...params, ...patch } });
  };

  // 切換多選方向狀態機
  const toggleDirection = (dir: 'left' | 'right' | 'top' | 'bottom' | 'all') => {
    if (dir === 'all') {
      if (hasAll) {
        setParams({ directions: [] });
      } else {
        setParams({ directions: ['all'] });
      }
      return;
    }

    let newDirs = activeDirs.filter(d => d !== 'all');
    if (newDirs.includes(dir)) {
      newDirs = newDirs.filter(d => d !== dir);
    } else {
      newDirs.push(dir);
    }

    // 如果 4 個方向都選，自動轉為 'all'
    if (
      newDirs.includes('left') &&
      newDirs.includes('right') &&
      newDirs.includes('top') &&
      newDirs.includes('bottom')
    ) {
      newDirs = ['all'];
    }

    setParams({ directions: newDirs });
  };

  // D-Pad 按鈕渲染
  const renderDpadButton = (
    dir: 'left' | 'right' | 'top' | 'bottom' | 'all',
    isActive: boolean,
    tooltip: string
  ) => {
    const getSvg = () => {
      const strokeWidth = 2.4;
      if (dir === 'top') {
        return (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className="block">
            <line x1="12" y1="19" x2="12" y2="5"></line>
            <polyline points="5 12 12 5 19 12"></polyline>
          </svg>
        );
      }
      if (dir === 'bottom') {
        return (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className="block">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <polyline points="19 12 12 19 5 12"></polyline>
          </svg>
        );
      }
      if (dir === 'left') {
        return (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className="block">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        );
      }
      if (dir === 'right') {
        return (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className="block">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        );
      }
      // 'all' 四周
      return (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className="block">
          <rect x="3" y="3" width="18" height="18" rx="2"></rect>
          <rect x="9" y="9" width="6" height="6"></rect>
        </svg>
      );
    };

    return (
      <button
        type="button"
        onClick={() => toggleDirection(dir)}
        className={`nodrag flex h-6 w-6 items-center justify-center border transition-all active:scale-90 rounded-none cursor-pointer ${
          isActive
            ? 'border-black bg-neutral-900 text-white'
            : 'border-black/10 bg-white hover:bg-neutral-100 text-neutral-600'
        }`}
        title={tooltip}
      >
        {getSvg()}
      </button>
    );
  };

  return (
    <div className={`group relative border border-black/12 bg-white shadow-sm w-[216px] overflow-visible ${ring}`}>
      <NodeDeleteButton onDelete={handleDelete} selected={selected} />
      <Handle type="target" position={Position.Left} />
      
      {/* 標題列 */}
      <div className="px-2 py-1 text-[10px] font-semibold text-neutral-500 tracking-wide uppercase border-b border-black/6 flex items-center justify-between">
        <span>外擴延伸</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setParams({ isCollapsed: !isCollapsed });
          }}
          className="nodrag text-neutral-400 hover:text-neutral-700 transition-colors w-4 h-4 flex items-center justify-center cursor-pointer"
          title={isCollapsed ? '展開控制參數' : '摺疊控制參數'}
        >
          <Icon name={isCollapsed ? 'expand_more' : 'expand_less'} size={12} />
        </button>
      </div>

      {!isCollapsed && (
        <div className="p-1.5 space-y-1.5">
          {/* 上半部：D-Pad 十字方向盤 + 下拉選單並排 */}
          <div className="flex gap-2 items-center">
            {/* D-Pad 十字多選方向盤 - 移除寫死寬高，由子按鈕 w-6 h-6 自動撐開以杜絕溢出跑位 */}
            <div className="grid grid-cols-3 gap-1 bg-neutral-100 p-1 border border-black/8 select-none flex-shrink-0 w-fit h-fit justify-items-center items-center">
              <div />
              {renderDpadButton('top', hasTop, '向上外擴')}
              <div />

              {renderDpadButton('left', hasLeft, '向左外擴')}
              {renderDpadButton('all', hasAll, '四周外擴')}
              {renderDpadButton('right', hasRight, '向右外擴')}

              <div />
              {renderDpadButton('bottom', hasBottom, '向下外擴')}
              <div />
            </div>

            {/* 下拉選單選取 */}
            <div className="flex-1 space-y-1">
              <select
                value={aspectRatio}
                onChange={(e) => setParams({ aspectRatio: e.target.value as OutpaintParams['aspectRatio'] })}
                className="nodrag block w-full border border-neutral-200 bg-neutral-50 px-1 py-0.5 text-[10px] font-medium focus:outline-none focus:border-neutral-400"
              >
                {RATIOS.map(ratio => (
                  <option key={ratio} value={ratio}>
                    {ratio === 'custom' ? '自訂像素' : ratio}
                  </option>
                ))}
              </select>

              <select
                value={params.model ?? 'gemini'}
                onChange={(e) => setParams({ model: e.target.value as OutpaintParams['model'] })}
                className="nodrag block w-full border border-neutral-200 bg-neutral-50 px-1 py-0.5 text-[10px] font-medium focus:outline-none focus:border-neutral-400"
              >
                <option value="gemini">Gemini</option>
                <option value="gpt">GPT</option>
              </select>
            </div>
          </div>

          {/* 模式 A：自訂像素滑桿微調 */}
          {aspectRatio === 'custom' && (
            <div className="flex flex-col gap-1 border border-black/8 bg-neutral-50/50 p-1.5 select-none">
              <style dangerouslySetInnerHTML={{__html: `
                .custom-node-slider {
                  -webkit-appearance: none;
                  appearance: none;
                  width: 100%;
                  height: 2px;
                  background: #e5e5e5;
                  outline: none;
                  margin: 6px 0;
                  padding: 0;
                }
                .custom-node-slider::-webkit-slider-thumb {
                  -webkit-appearance: none;
                  appearance: none;
                  width: 8px;
                  height: 12px;
                  background: #111827;
                  cursor: pointer;
                  border: 1px solid #111827;
                  border-radius: 0px;
                  transition: background 0.15s;
                }
                .custom-node-slider::-webkit-slider-thumb:hover {
                  background: #4b5563;
                }
                .custom-node-slider::-moz-range-thumb {
                  width: 8px;
                  height: 12px;
                  background: #111827;
                  cursor: pointer;
                  border: 1px solid #111827;
                  border-radius: 0px;
                }
              `}} />
              <div className="flex justify-between items-center text-[9px] text-neutral-500 font-semibold">
                <span>外擴尺寸微調</span>
                <span className="text-black font-bold font-mono">{pixelOffset}px</span>
              </div>
              <input
                type="range"
                min="64"
                max="512"
                step="32"
                value={pixelOffset}
                onChange={(e) => setParams({ pixelOffset: parseInt(e.target.value) })}
                className="nodrag w-full custom-node-slider cursor-pointer"
              />
            </div>
          )}

          {/* 提示詞補充 */}
          <textarea
            value={params.prompt ?? ''}
            onChange={(e) => setParams({ prompt: e.target.value })}
            placeholder="補足背景、外擴內容描述…"
            className="nodrag block w-full h-[40px] resize-none border border-neutral-200 px-1.5 py-1 text-[10px] leading-normal focus:outline-none focus:border-neutral-400 bg-neutral-50"
          />
        </div>
      )}

      <NodeResultPreview id={id} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
