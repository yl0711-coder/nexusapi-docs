# NexusAPI 文档站

本仓库是 NexusAPI 的 Mintlify 文档源代码。原有 VitePress 项目
脚本/DocsPlatform 保留不动；本仓库是独立的新版部署源。

## 内容范围

- 七种语言的产品使用、接口接入、工具配置、账单说明和故障排查
- 截图等静态资源位于 images/nexusapi/
- 旧项目中未完成人工审校的多语言草稿不会发布到新版站点

## 当前维护基线

- 模型推荐协议页位于 `developer/model-protocols.mdx`，七种语言使用同一份 `data/model-protocols.json` 清单。客户页面和公开数据只包含当前启用模型，不展示停用模型、历史清单或内部盘点数字。完整核对记录保存在文档仓库之外。
- 当前推荐规则：Claude 用 Messages；GPT 按分组区分 Responses 与 Chat Completions；DeepSeek、GLM、Kimi、Qwen、Grok 当前启用项用 Chat Completions。模型、分组或渠道协议变更后需重新核对，不把配置声明写成逐项实测通过。
- 本轮内容核对日期：2026-11-10；依据 New API `v1.0.0-rc.48` 源码及线上公开状态核对。七种语言已同步密钥额度查询、API 地址入口、日志导出、扣费来源、模型性能统计和余额提醒说明；密码、登录会话及访问令牌入口改为 `/security`，通知设置仍在 `/profile`。
- 线上公开状态核对：日志导出已开启，单次查询/导出最大时间跨度为 365 天，余额提醒已开启。时间跨度不是日志保留承诺；站点设置变化后须同步说明。
- 2026-11-10 已在指定的 9225 独立浏览器以普通用户身份核对 rc48 页面，更新七种语言共 77 张平台截图：密钥列表、创建表单、钱包充值区域、模型广场、日志、安全页、通知设置、复制 Key、模型选择、登录会话和导出窗口。先在 DOM 中隐藏个人数据，再保存 PNG；创建与导出只打开窗口，未提交。Key 复制示意中的 `YOUR_API_KEY` 为占位符，橙色框为操作提示。
- 77 张图完成文件哈希核对与 11 组七语言对照图审看，并回填相应页面；旧图备份和验收记录位于文档仓库外的 `Log/nexusapi-docs-rc48-review/`。不再引用旧个人资料整页安全图；其他未涉及版本变化的客户端配图保留。
- 上线前终检将 7 张无引用的旧 `console-profile-security` 图片移出发布仓库，备份于上述审校目录的 `obsolete-profile-images/`，可按哈希清单恢复；自动检查同时禁止重新混入这组旧入口图片。
- 本轮是普通用户页面、控件与图片验收，不是付费业务全链路测试：未创建或修改密钥、未修改分组、未修改账户通知设置、未付款、未导出真实日志、未发起模型调用。最终批量取图使用站内导航与语言菜单；语言设置的后台保存被拦截，结束后恢复原语言。
- 截图更新时应检查账号、余额、密钥、用户日志及内部渠道信息的脱敏，不发布真实客户记录。
- 倍率与折扣说明位于 `billing/multipliers-and-discounts.mdx`；示例不是实时价格承诺，维护时必须保留充值实付成本、参考汇率和同模型同计费项目的比较前提。
- 站点配置或计费规则变更时，同时核对快速开始、API 密钥、充值、模型计费、日志和账户安全页面及其六份译文。
- 客户使用路径已补齐到现有页面：主页直达操作、快速开始四项核对、按软件选模型、更换模型/分组/Key、切回原供应商、配置未生效自查。七种语言使用固定锚点 `choose-model`、`change-model`、`change-key`、`switch-back` 和 `setup-not-applied`，改标题时不要删除锚点。沿用原软件安装命令和配置块，不新增未经验证的客户端。
- 修改密钥分组不重新生成 Key，但影响共用这把 Key 的应用；依据 rc48 `UpdateToken` 与 `Token.Update` 核对，并确认普通用户页面有编辑入口，未执行实际修改。正常换 Key 与泄露后立即停用分开写。
- OpenAI Docs 核对来源：[Connect to a gateway](https://learn.chatgpt.com/docs/enterprise/connect-to-a-gateway)。保留 Codex 的 Provider、`model` 和环境变量配置方式；验证使用新对话、`/status` 与网关日志，不靠 AI 自报身份判断路由。官方支持与本站实际能力分别核对，不把通用官方功能当作本站承诺。
- 未提供统一客服联系方式前，只引导已有客户回原服务群或联系开通账号的对接人；不得编造客服二维码、邀请链接、联系方式或响应时效。新客户独立咨询入口仍待运营提供。

## 客户文档写法

- 先给操作步骤：点哪里、填什么、做完看到什么。不把内部实现和公式推导放进基础操作页。
- 一个页面解决一个常见问题。常规字段给填写示例；不需要改的明确写“保持默认”。
- 基础排错只写客户能照做的动作；协议、请求头、并发算法等技术原因默认折叠，普通客户不必先学会诊断。客服模板允许未知项留空。
- 费用用具体数字举例，在同一处写清示例条件，不把示例折扣当作固定报价。
- 折扣页先放常用倍率的人民币算例；充值比例、同模型同单价与参考汇率须在表格前可见，不能藏在折叠说明里。页面已计算倍率的价格不能再乘一次。
- 安全和费用提醒用一句清楚的话说完，避免堆叠术语和长段说明。
- 七种语言同步维护；接口参考保留必要参数，但不要求普通客户先读接口原理。
- 多语言术语以当前控制台的按钮和字段名称为准；API key 不能译成密钥对，软件 client 不能译成客户，余额与额度上限不能混为一谈。
- 只翻译说明文字；代码、配置键名、占位符、接口路径、图片文件名和链接地址保持原样。费用示例明确币种；非中文版本用“支付官方价格的百分之几”，不要误写成“减免百分之几”。
- 当前只维护文本与代码模型的客户使用路径，图片生成教程暂存于本地审校目录，不作为已开放服务发布。常用倍率算例使用 `0.7x`、`1.2x`、`1.3x`、`5.6x`。

## 本地预览

需要 Node.js 20.17 或更高版本。

~~~bash
npx --yes mint@4.2.1141 dev
~~~

检查内部链接：

~~~bash
npx --yes mint@4.2.1141 broken-links
~~~

检查导航、七种语言页面是否齐全、Frontmatter、站内链接，以及译文是否保留原文的教程结构：

~~~bash
node scripts/check-docs.mjs
~~~

Mintlify CLI 固定为已验证的 `4.2.1141`。升级 CLI 前重新运行本地预览和链接检查，避免 `latest` 临时指向未发布版本时影响维护。

完整链接验收（先启动本地预览；会访问外部官网，但不会执行安装脚本或调用模型）：

~~~bash
node --test scripts/check-docs.test.mjs scripts/check-links.test.mjs scripts/model-protocols.test.mjs scripts/rc48-customer-guides.test.mjs scripts/customer-journeys.test.mjs scripts/screenshots.test.mjs
node scripts/check-links.mjs --preview http://localhost:3000 --external --report /tmp/nexusapi-doc-links.json
~~~

该检查覆盖页面、图片、同语言链接、章节锚点、旧链接跳转和外部地址，并对照页面标题，避免 HTTP 200 却跳错页面。遇到外部官网 TLS、403 或限流时，保留失败结果并用浏览器人工复核，不把网络限制当成死链，也不将未核实链接算作通过。

## 提交质量检查

仓库的 [Docs quality](.github/workflows/docs-quality.yml) 会在修改文档、截图、`docs.json` 或检查脚本后，自动执行：

1. 检查导航指向的页面是否存在；
2. 检查七种语言的路由是否一一对应；
3. 检查每页的 `title`、`description`、站内链接和本地教程截图；
4. 检查每个译文页的章节、代码示例和教程截图数量不低于简体中文源页，防止后续提交把完整教程缩成摘要；
5. 运行 Mintlify 的 `broken-links` 检查。
6. 运行链接解析测试、URL 与语言路径检查；JSON 配置示例也会解析检查。
7. 检查空白章节、FAQ 漏译，以及英、法、俄、越南语正文中的中文标点残留。自动检查只能防止格式和漏项回归，不能替代译文语义审校。
8. 检查品牌脚本语法，并运行 Mintlify 官方严格校验与构建。品牌脚本或样式变更也会触发此工作流。

工作流会在推送 `main` 和创建/更新 Pull Request 时运行。若要让不通过的检查**无法合并**，需要在 GitHub 仓库的 **Settings → Branches → Add branch protection rule** 中为 `main` 勾选 **Require a pull request before merging** 与 **Require status checks to pass before merging**，并选择 `Validate documentation`。

## 部署到 Mintlify

### 已有线上站点的版本更新

1. 在当前项目中确认绑定仓库为 `yl0711-coder/nexusapi-docs`、发布分支为 `main`；已有项目不需要重新建站或修改域名。
2. 确认质量检查通过，并把新增页面、截图、检查脚本和旧页面删除一并提交，不能只提交已有文件的修改。
3. 合并发布前记录线上当前版本的提交号；合并后在 Mintlify 确认部署成功。
4. 在线上复查首页、快速开始、倍率折扣、工具配置、语言切换及旧地址跳转。本地通过不代表线上部署已成功。
5. 若出现严重问题，优先在 Mintlify 回退到上一成功部署；需要回退代码时，通过新的 revert 提交撤销本次发布，不重写 `main` 历史。

### 首次建站时

1. 在 Mintlify Dashboard 新建一个 Documentation 项目。
2. 连接 GitHub 仓库：yl0711-coder/nexusapi-docs。
3. 选择 main 分支和仓库根目录。
4. 等首次部署成功后，在 Settings → Domain Setup 绑定新域名。
5. 先完成 Dashboard 给出的两个 TXT 验证记录，再把目标子域名的 CNAME 指向 Mintlify 给出的地址。

不要在仓库、文档或截图中提交 API Key、系统令牌、账户余额或用户日志。

## 品牌标识

站点左上角与页脚的品牌区由三处共同维护：`docs.json` 负责目标地址、`brand.css`
显示 `NexusAPI` 文字标识、`brand-link.js` 将品牌链接固定为在新窗口打开官网。页脚不再
重复显示无文字的官网图标。
