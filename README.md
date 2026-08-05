# NexusAPI 文档站

本仓库是 NexusAPI 的 Mintlify 文档源代码。原有 VitePress 项目
脚本/DocsPlatform 保留不动；本仓库是独立的新版部署源。

## 内容范围

- 简体中文的产品使用、接口接入、工具配置、账单说明和故障排查
- 截图等静态资源位于 images/nexusapi/
- 旧项目中未完成人工审校的多语言草稿不会发布到新版站点

## 本地预览

需要 Node.js 20.17 或更高版本。

~~~bash
npx mint@latest dev
~~~

检查内部链接：

~~~bash
npx mint@latest broken-links
~~~

## 部署到 Mintlify

1. 在 Mintlify Dashboard 新建一个 Documentation 项目。
2. 连接 GitHub 仓库：yl0711-coder/nexusapi-docs。
3. 选择 main 分支和仓库根目录。
4. 等首次部署成功后，在 Settings → Domain Setup 绑定新域名。
5. 先完成 Dashboard 给出的两个 TXT 验证记录，再把目标子域名的 CNAME 指向 Mintlify 给出的地址。

不要在仓库、文档或截图中提交 API Key、系统令牌、账户余额或用户日志。

