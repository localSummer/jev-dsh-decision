# 决策模型 Jev

iPolloWork 官方维护的独立决策插件。同一份轻量核心，同时支持 iPolloWork 插件包与 DeepSeek Harness 原生插件。不修改 OpenCode、DSH 或 Codex 引擎，不接管主 Agent。

<img src="assets/jev.png" width="64" alt="Jev / TypeSafe AI" />

## 能做什么

- 根据任务，在**当前真实可用且获准使用**的工具、Skill、Agent 之间推荐选择。
- 按明确标准评分、判断是否需要某项能力；独立问题可以一次批量评估。
- 返回选择、概率、置信度与用量；**不执行推荐动作，也不自动切换模型或路由所有请求**。
- 提供本地配置检查和真实连接测试。连接测试会产生少量 TypeSafe API 用量。

Jev 是 TypeSafe AI 的结构化决策模型，不是聊天模型。原 Agent 继续负责规划、解释、参数构造、工具执行和原生子 Agent 协作。Jev 不返回文字推理过程，Agent 的解释不能冒充 Jev 的原始输出。

## iPolloWork 安装

1. 下载 `jev-decision-model-0.1.0.ipollowork-plugin`。
2. 在 **扩展 → 导入插件包** 中选择该文件，确认发布者为 **iPolloWork**。
3. 打开插件授权，填写自己的 **TypeSafe API Key**，再运行“测试 Jev 连接”。不要把密钥发到聊天中。
4. 在对话中启用插件，例如：“用 Jev 判断这个任务需要哪些已安装的 Skill，然后由你执行。”

**兼容条件：**客户端必须包含 `ipollowork/ipollowork-2026` 官方签名公钥注册。旧版客户端没有此注册时会拒绝本地可执行插件，不能通过改名、伪装学校发布者或绕过校验解决。源代码声明的最低版本号不代表所有旧版本已包含此公钥。

官方签名公钥（SPKI DER，Base64）：

```text
MCowBQYDK2VwAyEAoHA9xxXNZPQ7y+AKpDBIXruNvwVasq7axjilzIY6RDE=
```

Work 通过原有 `ipollowork_extension_list_actions` / `ipollowork_extension_call` 暴露 `status`、`check-connection`、`evaluate`。Skill 随包归属、启停与卸载；插件没有额外的全局脚本或后台守护进程。卸载由 Work 清理包内容和插件授权，不会删除 TypeSafe 云端账户。

## DSH 独立安装

这是原生 `dsh.bundle`，不依赖运行 iPolloWork。安装已下载的包：

```sh
dsh plugin add /absolute/path/dsh-jev-decision-model-0.1.0.tgz
```

也可以先克隆本仓库，再通过绝对路径安装：

```sh
git clone https://github.com/Devin-AXIS/jev-decision-plugin.git
dsh plugin add /absolute/path/jev-decision-plugin
```

插件使用 DSH 原有凭据服务的 `TYPESAFE_API_KEY`。可用环境变量或 DSH 凭据管理配置，不要写入插件文件或聊天记录。需要启用 DSH 的 `credentials`、`tools` 和 `skills` 服务（官方默认配置提供这些服务）。本插件不会安装自己的凭据系统。

工具为 `jev_status`、`jev_check_connection`、`jev_evaluate`；Skill 为 `jev-decision`。工具遵循 DSH 的原生注册、权限和取消流程。卸载后新会话不再加载它们：

```sh
dsh plugin remove dsh-jev-decision-model
```

DSH 凭据由宿主统一持有，插件卸载不会擅自删除可能被其他插件共用的 `TYPESAFE_API_KEY`；不再需要时请在 DSH 凭据管理或环境中移除。运行中的 DSH 会话应重启以加载新的插件配置。

## 调用格式

`evaluate` 与 `jev_evaluate` 使用相同参数：

```json
{
  "state": { "task": "为已收集的竞品资料制作汇报", "available": ["research", "slides"] },
  "questions": {
    "owner": {
      "type": "choice",
      "instructions": "哪个已提供的 Agent 最适合负责最终交付？",
      "criteria": { "research": "负责资料分析", "slides": "负责演示文稿" }
    },
    "need_review": { "type": "noul", "instructions": "这个任务是否需要审稿？" },
    "clarity": { "type": "score", "instructions": "任务要求是否清楚？", "criteria": ["不明确", "部分明确", "明确"] }
  }
}
```

问题类型是 `choice`（单选）、`score`（等级评分）、`noul`（是的概率）。多个互补 Skill 可使用多个独立 `noul` 问题。传入最小必要上下文，不传密钥或无关私密资料。网络固定发往 `https://api.typesafe.ai/v1/systemone`；默认模型 `jev-latest`。

插件限制每次 64 个问题、256 KiB 请求、1 MiB 响应、20 秒总网络时限；仅对 429/529 最多重试两次。没有无限重试、后台自动学习或全局请求拦截。错误会脱敏，不返回上游错误正文。

## 开发和测试

Node >=20.11，pnpm；运行时零第三方依赖。JSZip 仅用于开发时构建 Work 包。

```sh
pnpm install --frozen-lockfile
pnpm test
DSH_RUNTIME_ROOT=/path/to/dsh-runtime pnpm test:dsh
pnpm package:dsh
DSH_RUNTIME_ROOT=/path/to/dsh-runtime DSH_CLI_TEST=1 pnpm test:dsh
```

Work 包使用宿主要求的 Ed25519 签名格式。私钥放在仓库之外，不随源码、安装包或发布附件分发：

```sh
IPOLLOWORK_PLUGIN_SIGNING_KEY=/secure/path/ipollowork-ed25519.pem \
IPOLLOWORK_PLUGIN_KEY_ID=ipollowork-2026 pnpm package:work
IPOLLOWORK_ROOT=/path/to/updated/iPolloWork pnpm test:work
pnpm package:dsh
```

Work 集成测试使用真实宿主 API，在独立临时目录测试签名、图标、导入、授权轮换、服务调用、卸载及篡改拒绝。TypeSafe 响应使用明确的测试数据，不代表真实 API 密钥已验证。DSH 测试使用真实工具与 Skill 注册表，检查加载和卸载。

## 来源与标识

- [TypeSafe AI 官方 API 文档](https://docs.typesafe.ai/api)
- [DSH 官方插件开发文档](https://github.com/deepseek-ai/deepseek-harness/tree/master/docs/user/develop)
- 图标原样取自 [TypeSafe 官方文档的黑色透明底图标](https://docs.typesafe.ai/mintlify-assets/_mintlify/favicons/ts-docs/zg2v0DiYB7xPw0I2/_generated/favicon/android-chrome-192x192.png)，安装包内嵌以便离线显示，未使用粉色版本。图标及品牌权利归原权利人所有。

“官方”指 **iPolloWork 官方插件**，不表示 TypeSafe AI 或 DeepSeek 对此插件的官方背书。
