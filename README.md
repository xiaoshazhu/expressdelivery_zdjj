# 飞书多维表格快递查询字段捷径

这是飞书多维表格 FaaS 字段捷径项目。字段配置完成后会自动查询物流，无需部署独立边栏前端和后端服务。

## 功能

- 从文本字段读取快递单号。
- 可选读取快递公司、核验手机号和刷新时间。
- 调用阿里云云市场快递查询接口。
- 输出物流摘要、快递单号、快递公司、公司编码、物流状态、最新轨迹、查询时间和完整轨迹。
- 支持自动识别快递公司；顺丰、中通等可传手机号或后四位进行核验。
- 将接口鉴权失败、额度耗尽和限流转换为飞书字段捷径标准错误码。

## 本地配置

复制凭证示例：

```sh
cp config.example.json config.json
```

在 `config.json` 中填写阿里云 AppCode，格式为：

```text
APPCODE 你的AppCode
```

`config.json` 已被 Git 忽略，真实凭证不会提交到仓库。此方案使用 AppCode 简单认证，不需要 AppKey 和 AppSecret。

## 开发与验证

要求 Node.js 14.16.0 或更高版本。

```sh
npm install
npm test
npm run build
npm start
```

启动后，在飞书多维表格中打开“字段捷径开发助手”，进入“FaaS 调试”，添加并运行“快递查询”。

## 打包

```sh
npm run pack
```

上架包生成于 `output/`。构建产物和本地凭证不会提交到 Git。

## 数据说明

字段捷径通过飞书 FaaS 的 `context.fetch` 请求：

```text
https://kzexpress.market.alicloudapi.com/api-mall/api/express/query
```

查询时会向阿里云云市场服务商传输快递单号、可选的快递公司编码，以及查询所必需的核验手机号。
