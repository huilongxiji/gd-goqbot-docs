# goqbot 文档站

[goqbot](https://github.com/huilongxiji/gd-goqbot-framework) 的使用文档（VitePress），独立于框架仓库。

发布后地址：https://huilongxiji.github.io/gd-goqbot-docs/

## 本地预览

需要 Node.js 20+。

```bash
npm install
npm run docs:dev
```

打开 `http://localhost:5173/gd-goqbot-docs/`。

## 发布到 GitHub Pages

源码进本仓库即可。Actions 只把构建产物作为 Pages artifact 托管，**不会把 HTML 再 commit 回来**。

1. 把本目录建成 GitHub 仓库 `gd-goqbot-docs` 并推送 `main`。
2. Settings → Pages → Source 选 **GitHub Actions**。

## 私有仓库能不能挂出去？

分两件事：**仓库私有** 和 **网站对外可见**。

| 你想要的 | 能不能 | 条件 |
|---|---|---|
| 仓库私有，网站**公开**（有链接就能看） | 可以 | 个人账号需要 **GitHub Pro**；组织需要 **Team** 及以上。免费账号的私有仓库不能开 Pages。 |
| 仓库私有，网站也**私有**（要登录且有仓库权限才能看） | 一般不行 | 只有 **GitHub Enterprise Cloud** 组织能给 Pages 做访问控制。 |
| 免费账号 | 仓库必须**公开**才能用 GitHub Pages | — |

也就是说：免费个人账号想挂文档站，这个文档仓库需要是 **public**。源码私有、站点公开，至少要 Pro。

不想升套餐时，可用 Cloudflare Pages / Vercel：从私有仓库拉取构建，站点仍然可以公开，免费额度通常够用。
