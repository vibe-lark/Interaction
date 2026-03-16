// 签名工具函数
const generateNonce = () => Math.random().toString(36).substr(2, 15);

const generateSignature = async (nonce: string, timestamp: string, secret: string, data: any) => {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  // 对参数键值对进行排序
  const data_sorted = Object.keys(data)
    .sort()
    .filter((x) => data[x] !== undefined)
    .map((k) => [k, data[k]]);
  const dataToSign = encoder.encode(nonce + timestamp + JSON.stringify(data_sorted));

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, dataToSign);
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

interface ApiConfig {
  id: string;
  url: string;
  method: string;
  body?: any[];
}

export default class LarkClient {
  app_id: string;
  app_secret: string;
  app: string; // pass_ticket or app identifier
  token: string | null = null;

  constructor({ app_id, app_secret, app }: { app_id: string; app_secret: string; app: string }) {
    this.app_id = app_id;
    this.app_secret = app_secret;
    this.app = app || app_id;
  }

  // 获取/刷新 tenant_access_token
  async updateToken() {
    const url = 'https://open.larkoffice.com/open-apis/auth/v3/tenant_access_token/internal';
    const body = {
      app_id: this.app_id,
      app_secret: this.app_secret,
    };
    
    // 通过代理发送请求
    const resp = await this.sendRequest(url, body, 'POST');
    if (resp && resp.tenant_access_token) {
      this.token = resp.tenant_access_token;
      return this.token;
    } else {
      console.error('Failed to update token:', resp);
      throw new Error(resp.msg || 'Failed to update token');
    }
  }

  // 通过 code 换取 session (用户信息)
  async code2session(code: string) {
    // 参照模板实现：直接请求 apaas 接口，无需 token，无需代理
    const url = 'https://apaas.feishuapp.cn/ae/public/ai__c/api';
    const body = {
      action: 'code2session',
      code,
    };
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (e) {
      console.error('Code2Session failed', e);
      return { code: -1, msg: e };
    }
  }

  // 发送请求（带签名，走代理）
  async sendRequest(url: string, body: any, method: string, headers: any = {}) {
    const nonce = generateNonce();
    const timestamp = Date.now().toString();
    const secret = 'good lark'; // 注意：实际生产环境请勿将 Secret 硬编码在前端

    // 严格对齐模板中的 data 结构
    const data = {
      url,
      body: body || null,
      retry: 1, // 模板默认值为 1
      method,
      pass_ticket: this.app,
      headers: headers, // 透传 headers
      context: {}, // 模板默认为 {}
      // authority_token: undefined // 模板中如果不存在则为 undefined，会被 filter 掉
    };

    const signature = await generateSignature(nonce, timestamp, secret, data);

    try {
      // 代理地址
      const proxyUrl = 'https://sd48sas7k47gkoieri13g.apigateway-cn-beijing.volceapi.com/api/lark';

      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Codoc-Nonce': nonce,
          'Codoc-Timestamp': timestamp,
          'Codoc-Signature': signature,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
         throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result;
    } catch (e: any) {
      console.error('Request failed', e);
      return { code: -1, msg: e.message };
    }
  }
}
