# 多人在线吹牛骰游戏 - 实现计划

## 概述
将现有的2人本地游戏升级为支持2-6人的在线多人游戏，包含AI玩家、房间系统、实时同步。

## 技术架构

```
前端 (React + Vite)          后端 (Node.js)
├── Zustand 状态管理          ├── Express + Socket.io
├── Socket.io-client          ├── RoomManager 房间管理
├── React Router              ├── GameEngine 游戏引擎
└── TailwindCSS               └── AIPlayer AI决策
```

## 实现步骤

### Phase 1: 后端基础 (优先)

**1.1 创建后端项目**
- 文件: `dice-game/server/`
- 技术: Node.js + TypeScript + Socket.io
- 核心模块: SessionManager, RoomManager, GameEngine

**1.2 WebSocket事件协议**
```
room:create → room:created
room:join → room:joined
game:bid → game:bidMade
game:challenge → game:roundResult
```

### Phase 2: 前端重构

**2.1 新增文件**
```
src/
├── store/gameStore.ts       # Zustand状态
├── hooks/useSocket.ts       # WebSocket Hook
├── services/socketService.ts
├── pages/
│   ├── LobbyPage.tsx        # 大厅
│   ├── RoomPage.tsx         # 房间等待室
│   └── GamePage.tsx         # 游戏页
├── components/
│   ├── Lobby/               # 大厅组件
│   ├── Room/                # 房间组件
│   └── GameTable/           # 多人游戏桌
└── router.tsx               # 路由配置
```

**2.2 修改文件**
- `types/game.ts` - 扩展Player/GameState类型
- `components/Game.tsx` - 适配多人模式
- `components/PlayerArea.tsx` - 支持2-6人显示
- `App.tsx` - 添加路由

### Phase 3: AI系统

**3.1 AI决策算法**
```typescript
AI回合:
├─ 50% → 叫牌 (基于概率计算)
└─ 50% → 开盅 (判断可信度)

难度差异:
- 简单: 阈值0.3, 容易被骗
- 普通: 阈值0.45, 平衡
- 困难: 阈值0.55, 精准判断
```

**3.2 概率计算**
- 使用二项分布计算叫点可信度
- 考虑1点万能规则
- 根据自己手牌推算

### Phase 4: 用户体验

**4.1 边界情况处理**
| 场景 | 处理 |
|------|------|
| 玩家断线 | AI接管30秒，可重连 |
| 房主退出 | 自动转移房主 |
| 操作超时 | AI自动决策 |

**4.2 动画与反馈**
- 摇骰子动画 1.5s
- 开盅揭示 2s
- 连接状态指示器
- Toast提示

## 关键文件清单

### 后端 (新建)
- `server/src/index.ts` - 入口
- `server/src/core/RoomManager.ts` - 房间管理
- `server/src/core/GameEngine.ts` - 游戏引擎
- `server/src/core/AIPlayer.ts` - AI决策
- `server/src/handlers/` - 事件处理器

### 前端 (新建/修改)
- `web/src/store/gameStore.ts` - 全局状态
- `web/src/hooks/useSocket.ts` - WebSocket
- `web/src/pages/*.tsx` - 页面组件
- `web/src/components/GameTable/` - 多人布局
- `web/src/types/` - 类型扩展

## 执行顺序

1. 创建后端项目结构
2. 实现WebSocket服务器 + SessionManager
3. 实现RoomManager房间系统
4. 前端添加路由和大厅页面
5. 前端实现房间等待室
6. 后端实现GameEngine
7. 前端适配多人游戏
8. 实现AI决策引擎
9. 实现断线重连
10. 优化用户体验
