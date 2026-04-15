# yumu-home

智能家居仪表盘 — Home Assistant 控制面板，基于 Vue 3 + Vite 构建。

## 🐳 Docker 部署 (Unraid)

### 方式 1：Docker Compose（推荐）

```bash
# 拉取并启动
docker compose up -d

# 查看日志
docker compose logs -f yumu-home
```

### 方式 2：Docker run

```bash
docker run -d \
  --name yumu-home \
  --restart unless-stopped \
  -p 3080:8080 \
  -e HA_TARGET=192.168.100.50:8123 \
  ghcr.io/alexing0805/yumu-home:latest
```

### 方式 3：Unraid Community Applications

在 Unraid 中添加 Docker 容器：

| 参数 | 值 |
|------|-----|
| **Name** | yumu-home |
| **Repository** | `ghcr.io/alexing0805/yumu-home:latest` |
| **Port** | Host `3080` → Container `8080` |
| **Variable: HA_TARGET** | `192.168.100.50:8123` |

### 方式 4：从源码构建

```bash
docker build -t yumu-home .
docker run -d --name yumu-home -p 3080:8080 -e HA_TARGET=192.168.100.50:8123 yumu-home
```

### 配置

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `HA_TARGET` | `192.168.100.50:8123` | Home Assistant 地址 (IP:端口，不加 http://) |

> **Token 配置**：启动后访问仪表盘，点击右上角 ⚙ 设置 → HA 连接，输入你的长期访问令牌并保存。Token 保存在浏览器本地，不经过服务器。

---

## 🛠️ 本地开发

```bash
# 安装依赖
npm install

# 创建 .env 文件
cp .env.example .env
# 编辑 .env 填入你的 HA Token

# 启动开发服务器
npm run dev
```

## 项目结构

```
src/
├── config.ts                    # HA 实体 ID 映射 + 类型定义
├── composables/
│   ├── useHa.ts                 # HA API 数据层
│   └── usePreferences.ts        # 用户偏好设置
├── components/
│   ├── StatusBar.vue            # 顶部状态栏
│   ├── ContentGrid.vue          # 卡片网格
│   ├── PlayerBar.vue            # 底部播放器
│   ├── WeatherDialog.vue        # 天气弹窗
│   ├── DetailDialog.vue         # 通用详情弹窗
│   └── SettingsDialog.vue       # 设置弹窗 (含 HA 连接配置)
├── App.vue                      # 组合壳
├── main.ts                      # 入口
└── style.css                    # 全局样式
```
