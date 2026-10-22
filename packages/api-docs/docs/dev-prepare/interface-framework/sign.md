# [#](#安全和授权) 安全和授权

开发者需要对每一次回调请求，根据回调中的签名等信息验证请求者身份，避免安全隐患。目前签名算法使用Ed25519。

## [#](#安全凭证) 安全凭证

开发者平台的 Bot Secret 用于加密签名字符串和服务器端验证签名字符串的密钥。用户必须严格保管安全凭证，避免泄露。

## [#](#验证签名) 验证签名

### [#](#_1-签名验证参数) 1. 签名验证参数

|字段名|说明|参考值|
|---|---|---|
|X-Signature-Ed25519|HTTP Header 中透传 Signature|3ecd\*\*\*（64字节）|
|X-Signature-Timestamp|HTTP Header 透传的签名时间戳|1636373772|
|HTTP Body|HTTP 请求中 Body 值|{"msg":"hello"}|

### [#](#_2-验证签名过程) 2. 验证签名过程

以下代码以Go语言为例,引用 `crypto/ed25519` 包实现 `Ed25519` 算法

* 根据开发者平台的 Bot Secret 值进行repeat操作得到签名32字节的 seed ,根据 seed 调用 Ed25519 算法生成32字节公钥

```go
  // 根据botSecret进行repeat操作后得到seed值计算出公钥
  seed := botSecret
  for len(seed) < ed25519.SeedSize {
    seed = strings.Repeat(seed, 2)
  }
  rand := strings.NewReader(seed[:ed25519.SeedSize])
  publicKey, privateKey, err := ed25519.GenerateKey(rand)
```

1  
2  
3  
4  
5  
6  
7

DEMO

```text
【输入】
secret: naOC0ocQE3shWLAfffVLB1rhYPG7
seed: naOC0ocQE3shWLAfffVLB1rhYPG7naOC
【输出】
publicKey: [215 195 98 254 120 174 248 31 242 50 135 180 147 98 139 93 176 42 60 79 227 11 33 94 77 25 96 155 93 118 103 58]
privateKey: [110 97 79 67 48 111 99 81 69 51 115 104 87 76 65 102 102 102 86 76 66 49 114 104 89 80 71 55 110 97 79 67 215 195 98 254 120 174 248 31 242 50 135 180 147 98 139 93 176 42 60 79 227 11 33 94 77 25 96 155 93 118 103 58]
```

1  
2  
3  
4  
5  
6

* 获取 HTTP Header 中 X-Signature-Ed25519 的值进行 hec (十六进制解码)操作后的得到 Signature 并进行校验

```go
  // 取HTTP header中X-Signature-Ed25519(进行hex解码)并校验 
  signature := req.Header.Get("X-Signature-Ed25519")
  if signature == "" {
    return false
  }
  sig, err := hex.DecodeString(signature)
  if err != nil {
    return false
  }
  if len(sig) != ed25519.SignatureSize || sig[63]&224 != 0 {
    return false
  }
```

1  
2  
3  
4  
5  
6  
7  
8  
9  
10  
11  
12

* 获取 HTTP Header 中 X-Signature-Timestamp 的和 HTTP Body 的值按照 timestamp+body 顺序进行组合成签名体msg

```go
    // 取HTTP header中 X-Signature-Timestamp 并校验
  timestamp := req.Header.Get("X-Signature-Timestamp")
  if timestamp == "" {
    return false
  }
  httpBody, err := io.ReadAll(req.Body)
  if err != nil {
    return false
  }
  // 按照timestamp+Body顺序组成签名体
  var msg bytes.Buffer
  msg.WriteString(timestamp)
  msg.Write(httpBody)
  if err != nil {
    return false
  }
```

1  
2  
3  
4  
5  
6  
7  
8  
9  
10  
11  
12  
13  
14  
15  
16

* 根据公钥、Signature、签名体调用 Ed25519 算法进行验证

```go
  ed25519.Verify(publicKey, msg.Bytes(), sig)
```

1

DEMO

```text
【输入】
secret: naOC0ocQE3shWLAfffVLB1rhYPG7
body: { "op": 0,"d": {}, "t": "GATEWAY_EVENT_NAME"}
timestamp: 1725442341

【输出】
sig: 865ad13a61752ca65e26bde6676459cd36cf1be609375b37bd62af366e1dc25a8dc789ba7f14e017ada3d554c671a911bfdf075ba54835b23391d509579ed002

```

1  
2  
3  
4  
5  
6  
7  
8

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区