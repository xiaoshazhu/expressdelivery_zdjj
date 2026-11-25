import {
  basekit,
  DateFormatter,
  field,
  FieldCode,
  FieldComponent,
  FieldType,
} from '@lark-opdev/block-basekit-server-api';

const { t } = field;

const ENDPOINT = 'https://express-delivery.anhuishuzhi.com/field/api/express/query';
const ICON_URL = 'https://lf3-static.bytednsdoc.com/obj/eden-cn/eqgeh7upeubqnulog/chatbot.svg';

type CarrierRule = {
  name: string;
  code: string;
  requirePhone?: boolean;
  phoneTip?: string;
};

// 常见承运商别名与规则字典（与本地 gya_express 数据库 express_carrier 表对齐）
const carrierAliases: Record<string, CarrierRule> = {
  '顺丰': { name: '顺丰速运', code: 'SF', requirePhone: true, phoneTip: '顺丰速运须提供收/寄件人真实有效电话号码（接口核验）' },
  '顺丰速运': { name: '顺丰速运', code: 'SF', requirePhone: true, phoneTip: '顺丰速运须提供收/寄件人真实有效电话号码（接口核验）' },
  '顺丰快递': { name: '顺丰速运', code: 'SF', requirePhone: true, phoneTip: '顺丰速运须提供收/寄件人真实有效电话号码（接口核验）' },
  '顺丰速递': { name: '顺丰速运', code: 'SF', requirePhone: true, phoneTip: '顺丰速运须提供收/寄件人真实有效电话号码（接口核验）' },
  'SF': { name: '顺丰速运', code: 'SF', requirePhone: true, phoneTip: '顺丰速运须提供收/寄件人真实有效电话号码（接口核验）' },

  '中通': { name: '中通快递', code: 'ZTO', requirePhone: true, phoneTip: '中通快递部分单号须提供收/寄件人真实有效电话号码（接口核验）' },
  '中通快递': { name: '中通快递', code: 'ZTO', requirePhone: true, phoneTip: '中通快递部分单号须提供收/寄件人真实有效电话号码（接口核验）' },
  '中通速递': { name: '中通快递', code: 'ZTO', requirePhone: true, phoneTip: '中通快递部分单号须提供收/寄件人真实有效电话号码（接口核验）' },
  'ZTO': { name: '中通快递', code: 'ZTO', requirePhone: true, phoneTip: '中通快递部分单号须提供收/寄件人真实有效电话号码（接口核验）' },

  '跨越': { name: '跨越速运', code: 'KYE', requirePhone: true, phoneTip: '跨越速运须提供收/寄件人真实有效电话号码（接口核验）' },
  '跨越速运': { name: '跨越速运', code: 'KYE', requirePhone: true, phoneTip: '跨越速运须提供收/寄件人真实有效电话号码（接口核验）' },
  '跨越物流': { name: '跨越速运', code: 'KYE', requirePhone: true, phoneTip: '跨越速运须提供收/寄件人真实有效电话号码（接口核验）' },
  'KYE': { name: '跨越速运', code: 'KYE', requirePhone: true, phoneTip: '跨越速运须提供收/寄件人真实有效电话号码（接口核验）' },

  '京东': { name: '京东快递', code: 'JD' },
  '京东物流': { name: '京东快递', code: 'JD' },
  '京东快递': { name: '京东快递', code: 'JD' },
  'JD': { name: '京东快递', code: 'JD' },

  '圆通': { name: '圆通速递', code: 'YTO' },
  '圆通速递': { name: '圆通速递', code: 'YTO' },
  '圆通快递': { name: '圆通速递', code: 'YTO' },
  'YTO': { name: '圆通速递', code: 'YTO' },

  '申通': { name: '申通快递', code: 'STO' },
  '申通快递': { name: '申通快递', code: 'STO' },
  'STO': { name: '申通快递', code: 'STO' },

  '韵达': { name: '韵达速递', code: 'YUNDA' },
  '韵达速递': { name: '韵达速递', code: 'YUNDA' },
  '韵达快递': { name: '韵达速递', code: 'YUNDA' },
  'YUNDA': { name: '韵达速递', code: 'YUNDA' },

  '极兔': { name: '极兔速递', code: 'JTSD' },
  '极兔速递': { name: '极兔速递', code: 'JTSD' },
  '极兔快递': { name: '极兔速递', code: 'JTSD' },
  'JTSD': { name: '极兔速递', code: 'JTSD' },

  '邮政': { name: '中国邮政', code: 'POSTB' },
  '中国邮政': { name: '中国邮政', code: 'POSTB' },
  '邮政快递包裹': { name: '中国邮政', code: 'POSTB' },
  'POSTB': { name: '中国邮政', code: 'POSTB' },

  'EMS': { name: 'EMS特快专递', code: 'EMS' },
  '特快专递': { name: 'EMS特快专递', code: 'EMS' },

  '德邦': { name: '德邦快递', code: 'DBL' },
  '德邦快递': { name: '德邦快递', code: 'DBL' },
  '德邦物流': { name: '德邦快递', code: 'DBL' },
  'DBL': { name: '德邦快递', code: 'DBL' },

  '安能': { name: '安能物流', code: 'ANE56' },
  '安能物流': { name: '安能物流', code: 'ANE56' },
  '安能快运': { name: '安能物流', code: 'ANE56' },
  'ANE56': { name: '安能物流', code: 'ANE56' },
};

// 运单号特征字母前缀匹配规则（未指定承运商时自动识别）
const prefixRules: Array<{ regex: RegExp; code: string; name: string; requirePhone?: boolean; phoneTip?: string }> = [
  { regex: /^SF/i, code: 'SF', name: '顺丰速运', requirePhone: true, phoneTip: '顺丰速运单号须填写收/寄件人真实有效电话号码（接口核验）' },
  { regex: /^KYE/i, code: 'KYE', name: '跨越速运', requirePhone: true, phoneTip: '跨越速运单号须填写收/寄件人真实有效电话号码（接口核验）' },
  { regex: /^(JD|JDV|JDX|JDVA|JDVB)/i, code: 'JD', name: '京东快递' },
  { regex: /^ZTO/i, code: 'ZTO', name: '中通快递', requirePhone: true, phoneTip: '中通快递单号部分须填写收/寄件人真实有效电话号码（接口核验）' },
  { regex: /^YT/i, code: 'YTO', name: '圆通速递' },
  { regex: /^STO/i, code: 'STO', name: '申通快递' },
  { regex: /^YUNDA/i, code: 'YUNDA', name: '韵达速递' },
  { regex: /^(JT|JTSD)/i, code: 'JTSD', name: '极兔速递' },
  { regex: /^POSTB/i, code: 'POSTB', name: '中国邮政' },
  { regex: /^(EMS|EY|EA)/i, code: 'EMS', name: 'EMS特快专递' },
  { regex: /^(DPK|DBL)/i, code: 'DBL', name: '德邦快递' },
  { regex: /^(ANE|ANE56)/i, code: 'ANE56', name: '安能物流' },
];

type PlainObject = Record<string, unknown>;

type TrackingEvent = {
  time: unknown;
  content: string;
  location: string;
  sortTime: number;
};

type ResultData = {
  id: string;
  summary: string;
  trackingNumber: string;
  carrier: string;
  carrierCode: string;
  status: string;
  latest: string;
  queriedAt: number;
  trace: string;
  syncLog: string;
};

function asObject(value: unknown): PlainObject {
  return value && typeof value === 'object' ? value as PlainObject : {};
}

function toPlainText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  if (Array.isArray(value)) return value.map(toPlainText).filter(Boolean).join('').trim();
  const objectValue = asObject(value);
  for (const key of ['text', 'value', 'title', 'name', 'label', 'fullPhone', 'phone', 'phoneNumber', 'number']) {
    const item = objectValue[key];
    if (typeof item === 'string' || typeof item === 'number') return String(item).trim();
  }
  return '';
}

/**
 * 智能承运商识别：优先使用用户填写的快递公司，其次根据单号前缀自动推断
 */
function detectCarrier(carrierInput: unknown, trackingNumber: string): { name: string; code: string; requirePhone: boolean; phoneTip: string } {
  const rawCarrier = toPlainText(carrierInput).replace(/[：:]/g, ' ').replace(/\s+/g, ' ').trim();
  if (rawCarrier && rawCarrier !== '自动识别') {
    const upper = rawCarrier.toUpperCase();
    const codeInText = rawCarrier.match(/(?:（|\()\s*([A-Z][A-Z0-9_-]{1,63})\s*(?:）|\))/)?.[1];
    const code = codeInText || upper;
    const known = carrierAliases[rawCarrier] || carrierAliases[upper]
      || Object.entries(carrierAliases).find(([key]) => rawCarrier.includes(key))?.[1];

    if (known) {
      return {
        name: known.name,
        code: known.code,
        requirePhone: Boolean(known.requirePhone),
        phoneTip: known.phoneTip || '',
      };
    }
    if (/^[A-Za-z0-9_-]{2,64}$/.test(rawCarrier)) {
      const isReq = ['SF', 'ZTO', 'KYE'].includes(code);
      return {
        name: rawCarrier,
        code,
        requirePhone: isReq,
        phoneTip: isReq ? `${rawCarrier}查询须提供收/寄件人有效11位手机号核验` : '',
      };
    }
  }

  // 根据单号前缀特征识别
  for (const rule of prefixRules) {
    if (rule.regex.test(trackingNumber)) {
      return {
        name: rule.name,
        code: rule.code,
        requirePhone: Boolean(rule.requirePhone),
        phoneTip: rule.phoneTip || '',
      };
    }
  }

  return { name: '自动识别', code: '', requirePhone: false, phoneTip: '' };
}

/**
 * 校验单号格式并拦截常见误填/失误输入
 */
function validateTrackingNumber(number: string): { ok: boolean; reason?: string } {
  if (!number) return { ok: false, reason: '请输入快递单号' };
  // 拦截中文提示词误填（如“自提”、“暂无单号”、“待发货”等）
  if (/[\u4e00-\u9fa5]/.test(number)) {
    return { ok: false, reason: '单号不能包含中文，请输入有效快递单号' };
  }
  // 长度检查：常见国内外运单号长度在 6 到 32 位之间
  if (number.length < 6) {
    return { ok: false, reason: '单号长度不足（至少6位）' };
  }
  if (number.length > 32) {
    return { ok: false, reason: '单号长度超限（最多32位）' };
  }
  // 允许承运商常见的字母/数字/连字符格式，但必须包含至少一个字母或数字
  if (!/^[A-Za-z0-9-]+$/.test(number) || !/[A-Za-z0-9]/.test(number)) {
    return { ok: false, reason: '单号格式有误，仅支持字母、数字或连字符' };
  }
  // 连续相同字符占位符防呆（如 00000000, 11111111 等无效单号）
  if (/^(\w)\1{7,}$/.test(number)) {
    return { ok: false, reason: '单号疑似占位符，请核对真实运单号' };
  }
  return { ok: true };
}

/** 只检查输入格式；运单与手机号是否匹配由阿里云快递查询接口判断。 */
function normalizePhone(phoneRaw: unknown): { phone: string; valid: boolean } {
  const value = toPlainText(phoneRaw).trim();
  const phone = value.replace(/[\s-]/g, '').replace(/^\+?86/, '');
  return { phone, valid: /^1[3-9]\d{9}$/.test(phone) };
}

function messageOf(payload: PlainObject, fallback = ''): string {
  for (const key of ['msg', 'message', 'Message', 'errorMsg']) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return fallback;
}

function timeValue(value: unknown): number {
  if (typeof value === 'number') return value;
  const text = String(value || '').trim();
  if (/^\d{11,}$/.test(text)) return Number(text);
  const parsed = Date.parse(text);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatTime(value: unknown, timeZone: string): string {
  const timestamp = timeValue(value);
  if (!timestamp) return String(value || '').trim() || '时间未知';
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      timeZone: timeZone || 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toISOString();
  }
}

function createResult(params: {
  id?: string;
  trackingNumber: string;
  carrierName?: string;
  carrierCode?: string;
  status: string;
  latest: string;
  summary: string;
  trace?: string;
  syncLog?: string;
  queriedAt?: number;
}): ResultData {
  const queriedAt = params.queriedAt || Date.now();
  return {
    id: params.id || `${params.carrierCode || 'AUTO'}:${params.trackingNumber || Date.now()}`,
    summary: params.summary,
    trackingNumber: params.trackingNumber,
    carrier: params.carrierName || '',
    carrierCode: params.carrierCode || '',
    status: params.status,
    latest: params.latest,
    queriedAt,
    trace: params.trace || '',
    syncLog: params.syncLog || `同步记录：${params.status}${params.latest ? `；${params.latest}` : ''}`.slice(0, 500),
  };
}

basekit.addDomainList(['express-delivery.anhuishuzhi.com']);


basekit.addField({
  // 显式声明无用户授权，确保打包后的 meta.json 和 config.json 保留空数组。
  authorizations: [],
  i18n: {
    messages: {
      'zh-CN': {
        waybillNumber: '快递单号',
        phone: '核验手机号',
        // 保留 refreshAt 这个配置键，避免已配置的字段捷径丢失引用；仅调整用户看到的名称。
        refreshAt: '按时更新字段（多选）',
        summary: '物流摘要',
        trackingNumber: '快递单号',
        carrierName: '快递公司',
        carrierCode: '快递公司编码',
        status: '物流状态',
        latest: '最新轨迹',
        queriedAt: '查询时间',
        trace: '完整轨迹',
        syncLog: '同步日志',
      },
    },
  },
  formItems: [
    {
      key: 'waybillNumber',
      label: t('waybillNumber'),
      component: FieldComponent.FieldSelect,
      props: {
        mode: 'single',
        supportType: [FieldType.Text, FieldType.Number],
      },
      // 默认指向“快递单号”列：表格有同名列时自动匹配；没有时该行会提示重新配置，可点下拉里的「快速创建」建列。
      defaultValue: '快递单号',
      validator: {
        required: false,
      },
      tooltips: [
        {
          type: 'text',
          content: '请选择存放快递单号的字段（文本或数字）。如果表里还没有，可先新建；如果之前选的字段已删除，可重新创建后再选择。单号支持 6 至 32 位字母、数字或连字符。',
        },
      ],
    },
    {
      key: 'phone',
      label: t('phone'),
      component: FieldComponent.FieldSelect,
      props: {
        mode: 'single',
        supportType: [FieldType.Text, FieldType.Number],
      },
      // 默认指向“核验手机号”列，匹配规则同上。
      defaultValue: '核验手机号',
      validator: {
        required: false,
      },
      tooltips: [
        {
          type: 'text',
          content: '部分快递公司需要核验手机号时，请选择存放完整 11 位收件人或寄件人手机号的字段。不需要核验时可以留空。若还没有该字段，可按需新建；若之前选的字段已删除，可重新创建后再选择。查询时会将单号与手机号一并提交给阿里云快递接口。',
        },
      ],
    },
    {
      key: 'refreshAt',
      label: t('refreshAt'),
      component: FieldComponent.FieldSelect,
      props: {
        mode: 'multiple',
        supportType: [FieldType.Text, FieldType.Number, FieldType.DateTime],
      },
      // 默认不绑定定时刷新列；只有用户配置飞书工作流后才会写入该列。
      defaultValue: ['快递单号', '核验手机号'],
      validator: { required: false },
      tooltips: [
        {
          type: 'text',
          content: '新增或修改单号、手机号时会触发查询。需要定时查询时，请先选择日期时间字段「定时刷新时间」，再启用飞书工作流按时写入该字段，并保持「自动更新」开启。如果还没有日期时间字段，可先新建；如果之前选的字段已删除，可重新创建后再选择。',
        },
        {
          type: 'link',
          text: '飞书工作流配置帮助',
          link: 'https://www.feishu.cn/hc/zh-CN/articles/740947703250',
        },
      ],
    },
  ],
  resultType: {
    type: FieldType.Object,
    extra: {
      icon: {
        light: ICON_URL,
      },
      tips: {
        desc: '由安汇数智「快递查询助手」提供服务，自动识别承运商并同步最新物流轨迹。字段捷径额度由飞书平台统一管理，开发者不单独分配或显示查询次数。',
      },
      properties: [
        {
          key: 'id',
          isGroupByKey: true,
          type: FieldType.Text,
          label: 'id',
          hidden: true,
        },
        {
          key: 'summary',
          type: FieldType.Text,
          label: t('summary'),
          primary: true,
        },
        {
          key: 'trackingNumber',
          type: FieldType.Text,
          label: t('trackingNumber'),
        },
        {
          key: 'carrier',
          type: FieldType.Text,
          label: t('carrierName'),
        },
        {
          key: 'carrierCode',
          type: FieldType.Text,
          label: t('carrierCode'),
        },
        {
          key: 'status',
          type: FieldType.Text,
          label: t('status'),
        },
        {
          key: 'latest',
          type: FieldType.Text,
          label: t('latest'),
        },
        {
          key: 'queriedAt',
          type: FieldType.DateTime,
          label: t('queriedAt'),
          extra: {
            dateFormat: DateFormatter.DATE_TIME_WITH_HYPHEN,
          },
        },
        {
          key: 'trace',
          type: FieldType.Text,
          label: t('trace'),
        },
        {
          key: 'syncLog',
          type: FieldType.Text,
          label: t('syncLog'),
        },
      ],
    },
  },
  options: {
    disableAutoUpdate: false,
  },
  execute: async (formItemParams, context) => {
    // 清洗单号：去除首尾及中间所有空白字符（处理复制单号带空格情况）
    const trackingNumber = toPlainText(formItemParams.waybillNumber).replace(/\s+/g, '').trim();

    try {
      // 1. 单号为空时的优雅处理（新加行未输入单号时，避免系统报错）
      if (!trackingNumber) {
        return {
          code: FieldCode.Success,
          data: createResult({
            trackingNumber: '',
            status: '待输入单号',
            latest: '请在单号列输入快递单号',
            summary: '待输入快递单号',
          }),
        };
      }

      if (context.isNeedPayPack === true && context.hasQuota === false) {
        return { code: FieldCode.FeishuPaidBenefitsExhausted };
      }

      // 2. 单号正则校验：6–32 位字母、数字、连字符
      const numberCheck = validateTrackingNumber(trackingNumber);
      if (!numberCheck.ok) {
        return {
          code: FieldCode.Success,
          data: createResult({
            trackingNumber,
            status: '单号格式有误',
            latest: numberCheck.reason || '单号格式错误',
            summary: `单号格式有误：${numberCheck.reason}`,
          }),
        };
      }

      // 3. 承运商智能识别（优先选择输入项，其次前缀自动匹配）
      const carrierInfo = detectCarrier(formItemParams.carrier, trackingNumber);

      // 4. 仅校验手机号格式，归属运单的判断交给阿里云快递接口。
      const { phone, valid: phoneFormatValid } = normalizePhone(formItemParams.phone);
      if (carrierInfo.requirePhone && !phone) {
        return {
          code: FieldCode.Success,
          data: createResult({
            trackingNumber,
            carrierName: carrierInfo.name,
            carrierCode: carrierInfo.code,
            status: '待补全手机号',
            latest: carrierInfo.phoneTip || '该承运商查询须提供完整收/寄件人手机号',
            summary: `【${carrierInfo.name}】待填写核验手机号 · 请填写完整11位收/寄件人手机号`,
          }),
        };
      }

      if (phone && !phoneFormatValid) {
        return {
          code: FieldCode.Success,
          data: createResult({
            trackingNumber,
            carrierName: carrierInfo.name,
            carrierCode: carrierInfo.code,
            status: '手机号格式有误',
            latest: '请填写完整的11位中国大陆手机号',
            summary: `【${carrierInfo.name}】手机号格式有误：请填写完整的11位收/寄件人手机号`,
          }),
        };
      }

      // 服务端只负责转发查询并持有阿里云凭据；字段捷径额度由飞书平台管理。
      const tenantKey = context.tenantKey?.trim();
      if (!tenantKey) return { code: FieldCode.ConfigError };
      const body = new URLSearchParams({ expressNo: trackingNumber });
      body.set('tenantKey', tenantKey);
      if (carrierInfo.code) body.set('cpCode', carrierInfo.code);
      if (phone) body.set('mobile', phone);

      const response = await context.fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          ...(context.packID && context.baseSignature ? {
            'X-Feishu-Pack-Id': context.packID,
            'X-Feishu-Base-Signature': context.baseSignature,
          } : {}),
        },
        body: body.toString(),
      });

      const raw = await response.text();
      let payload: PlainObject = {};
      try {
        payload = raw ? asObject(JSON.parse(raw)) : {};
      } catch {
        payload = {};
      }

      if (!response.ok) {
        const detail = `${messageOf(payload, raw.slice(0, 200))} ${response.headers.get('x-ca-error-message') || ''}`.trim();
        if (response.status === 402) return { code: FieldCode.Error };
        if (response.status === 503 && payload.code === 'FIELD_PROVIDER_UNAVAILABLE') return { code: FieldCode.Error };
        if (response.status === 401 && payload.code === 'FIELD_SOURCE_UNVERIFIED') return { code: FieldCode.AuthorizationError };
        if (response.status === 401 || response.status === 403) {
          return { code: FieldCode.Success, data: createResult({ trackingNumber, carrierName: carrierInfo.name, carrierCode: carrierInfo.code, status: '查询服务异常', latest: '物流服务授权异常，请联系开发者', summary: '物流服务授权异常，请联系开发者' }) };
        }
        if (response.status === 429) return { code: FieldCode.RateLimit };
        if (/手机号|电话号码|mobile|后四位/i.test(detail)) {
          return {
            code: FieldCode.Success,
            data: createResult({
              trackingNumber,
              carrierName: carrierInfo.name,
              carrierCode: carrierInfo.code,
              status: '手机号核验失败',
              latest: detail,
              summary: `【${carrierInfo.name}】手机号核验失败：${detail}`,
            }),
          };
        }
        return {
          code: FieldCode.Success,
          data: createResult({
            trackingNumber,
            carrierName: carrierInfo.name,
            carrierCode: carrierInfo.code,
            status: '接口异常',
            latest: `HTTP ${response.status}${detail ? `：${detail}` : ''}`,
            summary: `物流接口异常（HTTP ${response.status}${detail ? `：${detail}` : ''}）`,
          }),
        };
      }

      const success = payload.success !== false && (payload.success === true || String(payload.code) === '200');
      const data = asObject(payload.data);
      if (!success || !Object.keys(data).length) {
        const detail = messageOf(payload, '未知错误');
        if (/quota|exhausted|次数|额度/i.test(detail)) return { code: FieldCode.Error };
        if (/手机号|mobile|验证|后四位/i.test(detail)) {
          return {
            code: FieldCode.Success,
            data: createResult({
              trackingNumber,
              carrierName: carrierInfo.name,
              carrierCode: carrierInfo.code,
              status: '手机号核验失败',
              latest: detail || '手机号与运单收/寄件人不匹配，核验失败',
              summary: `【${carrierInfo.name}】手机号核验失败：${detail || '手机号不正确'}，请检查“核验手机号”列是否为正确的11位号码`,
            }),
          };
        }
        if (/无轨迹|未查询|不存在|暂无/i.test(detail)) {
          return {
            code: FieldCode.Success,
            data: createResult({
              trackingNumber,
              carrierName: carrierInfo.name,
              carrierCode: carrierInfo.code,
              status: '暂无轨迹',
              latest: '暂未查询到物流轨迹，请检查单号、承运商或是否已发货',
              summary: `【${carrierInfo.name}】暂未查询到轨迹，请检查单号及是否已揽收`,
            }),
          };
        }
        return {
          code: FieldCode.Success,
          data: createResult({
            trackingNumber,
            carrierName: carrierInfo.name,
            carrierCode: carrierInfo.code,
            status: '查询失败',
            latest: detail,
            summary: `查询失败：${detail}`,
          }),
        };
      }

      const rawEvents = Array.isArray(data.logisticsTraceDetailList) ? data.logisticsTraceDetailList : [];
      const events: TrackingEvent[] = rawEvents
        .map((item): TrackingEvent => {
          const event = asObject(item);
          return {
            time: event.time,
            content: String(event.desc || '').trim(),
            location: String(event.areaName || '').trim(),
            sortTime: timeValue(event.time),
          };
        })
        .filter(item => Boolean(item.content))
        .sort((left, right) => right.sortTime - left.sortTime);

      const providerNumber = String(data.mailNo || trackingNumber);
      const providerCarrierCode = String(data.cpCode || carrierInfo.code || '');
      const providerCarrier = String(data.logisticsCompanyName || providerCarrierCode || carrierInfo.name || '自动识别');
      const status = String(data.logisticsStatusDesc || data.logisticsStatus || '状态未知');
      const latest = String(data.theLastMessage || events[0]?.content || '已查询到物流信息');

      const traceLines = events.slice(0, 50).map(item => {
        const location = item.location ? `（${item.location}）` : '';
        return `${formatTime(item.time, context.timeZone)}  ${item.content}${location}`;
      });
      if (events.length > 50) traceLines.push(`其余${events.length - 50}条轨迹未展示`);
      const trace = traceLines.join('\n').slice(0, 9500);

      const result: ResultData = {
        id: `${providerCarrierCode || 'AUTO'}:${providerNumber}`,
        summary: `${providerCarrier} · ${status} · ${latest}`.slice(0, 500),
        trackingNumber: providerNumber,
        carrier: providerCarrier,
        carrierCode: providerCarrierCode,
        status,
        latest,
        queriedAt: Date.now(),
        trace,
        syncLog: `同步成功：${providerCarrier}；轨迹 ${events.length} 条；${formatTime(Date.now(), context.timeZone)}`.slice(0, 500),
      };

      return {
        code: FieldCode.Success,
        data: result,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(JSON.stringify({
        message,
        logID: context.logID,
      }));
      return {
        code: FieldCode.Success,
        data: createResult({
          trackingNumber,
          status: '查询异常',
          latest: message || '未知错误',
          summary: `查询异常：${message || '未知错误'}`,
        }),
      };
    }
  },
});

export default basekit;
