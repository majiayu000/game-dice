# 吹牛骰 (Liar's Dice)

一个多人在线吹牛骰游戏，支持 2-6 人对战，可添加 AI 玩家。

[快速开始](#快速开始) · [游戏规则](#游戏规则) · [多人实现设计](docs/multiplayer-implementation.md)

## 游戏规则

- 每位玩家有 5 颗骰子
- 玩家轮流叫点（如"3个5"），下家必须加码或开盅
- 1 点为万能点（可当任意点数），除非叫"斋"
- 开盅时统计所有玩家骰子，猜错者输掉一颗骰子
- 骰子用完的玩家出局，最后存活者获胜

### 本项目的叫点与加码例子

叫点只能选择 **2 到 6 点**，数量为正整数，不能叫「几个1」。加码时，数量增加即可；数量相同则点数必须更大。比如当前是「3个5」，可叫「3个6」或「4个2」，不能叫「3个4」或「2个6」。切换「斋」本身不构成加码。

假设两位玩家的骰子是 `[1,5,2,3,6]` 和 `[5,1,4,4,6]`：普通叫5时，两颗1也算5，共有4个；叫「斋5」时只数真正的5，共有2个。因此「3个5」普通叫法成立，同样数量的「斋5」不成立。开盅时，实际数量少于所叫数量，挑战者胜；否则挑战者败。

这些例子对应 [gameLogic.ts](server/src/utils/gameLogic.ts) 的 `isValidBid`、`countDice` 与 `challenge`。其他吹牛骰规则页可能采用不同变体，请按本项目实现判断。

### 创建第一间房

输入昵称并连接后，创建或加入房间；房主可添加 AI 玩家。至少两位玩家且所有玩家准备后，房主才能开始。AI 决策实现见 [aiLogic.ts](server/src/utils/aiLogic.ts)，房间准备按钮与开局条件见 [RoomPage.tsx](web/src/pages/RoomPage.tsx)。

## 技术栈

- **前端**: React 19 + TypeScript + Vite + Zustand
- **后端**: Node.js + Express + Socket.io
- **通信**: WebSocket 实时双向通信

## 快速开始

### 安装依赖

下面命令均从仓库根目录执行：

```bash
npm --prefix server install
npm --prefix web install
```

### 启动服务

终端一启动后端（默认端口 3001）：

```bash
npm --prefix server run dev
```

终端二从仓库根目录启动前端（默认端口 5173）：

```bash
npm --prefix web run dev
```

### 访问游戏

打开浏览器访问 `http://localhost:5173`

### 页面打开了，为什么房间连不上

前端页面和 Socket.IO 后端都需要运行。检查终端一是否正常监听后端，再检查浏览器连接错误。客户端地址来自 [socketService.ts](web/src/services/socketService.ts) 的 `VITE_SERVER_URL`，默认 `http://localhost:3001`。

在第二台设备上，`localhost` 指向第二台设备自身；联机时需要可达的后端地址、对应前端构建配置与服务端网络配置。单独发布静态页面不能提供房间服务。多人状态和事件设计见 [多人实现文档](docs/multiplayer-implementation.md)。

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

## 问题反馈与更新

遇到问题时，请在 [Issues](https://github.com/majiayu000/game-dice/issues) 写明浏览器或编辑器版本、所用提交、复现步骤和报错文字。当前源码变化见 [提交记录](https://github.com/majiayu000/game-dice/commits/main/)。
