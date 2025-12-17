# 吹牛骰 (Liar's Dice)

一个多人在线吹牛骰游戏，支持 2-6 人对战，可添加 AI 玩家。

## 游戏规则

- 每位玩家有 5 颗骰子
- 玩家轮流叫点（如"3个5"），下家必须加码或开盅
- 1 点为万能点（可当任意点数），除非叫"斋"
- 开盅时统计所有玩家骰子，猜错者输掉一颗骰子
- 骰子用完的玩家出局，最后存活者获胜

## 技术栈

- **前端**: React 19 + TypeScript + Vite + Zustand
- **后端**: Node.js + Express + Socket.io
- **通信**: WebSocket 实时双向通信

## 快速开始

### 安装依赖

```bash
# 安装后端依赖
cd server && npm install

# 安装前端依赖
cd ../web && npm install
```

### 启动服务

```bash
# 启动后端 (端口 3001)
cd server && npm run dev

# 启动前端 (端口 5173)
cd web && npm run dev
```

### 访问游戏

打开浏览器访问 `http://localhost:5173`

## 项目结构

```
dice-game/
├── server/                 # 后端服务
│   ├── src/
│   │   ├── core/          # 核心逻辑
│   │   │   ├── GameEngine.ts    # 游戏引擎
│   │   │   └── RoomManager.ts   # 房间管理
│   │   ├── utils/
│   │   │   ├── aiLogic.ts       # AI 决策算法
│   │   │   └── logger.ts        # 日志系统
│   │   ├── types/         # 类型定义
│   │   └── index.ts       # 入口文件
│   └── package.json
├── web/                    # 前端应用
│   ├── src/
│   │   ├── components/    # UI 组件
│   │   ├── pages/         # 页面
│   │   ├── hooks/         # 自定义 Hooks
│   │   ├── services/      # Socket 服务
│   │   ├── store/         # Zustand 状态
│   │   └── types/         # 类型定义
│   └── package.json
└── docs/                   # 文档
```

## 功能特性

- 创建/加入房间
- 添加 AI 玩家（简单/普通/困难）
- 实时游戏状态同步
- 玩家超时自动开盅
- 游戏内存自动清理

## License

MIT
