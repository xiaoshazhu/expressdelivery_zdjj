import {
  AuthorizationType,
  basekit,
  DateFormatter,
  field,
  FieldCode,
  FieldComponent,
  FieldType,
} from '@lark-opdev/block-basekit-server-api';

const { t } = field;

const ENDPOINT = 'https://kzexpress.market.alicloudapi.com/api-mall/api/express/query';
const AUTHORIZATION_ID = 'aliyun_appcode';
const ICON_URL = 'https://lf3-static.bytednsdoc.com/obj/eden-cn/eqgeh7upeubqnulog/chatbot.svg';

const carrierAliases: Record<string, string> = {
  '京东': 'JD',
  '京东物流': 'JD',
  '京东快递': 'JD',
  '邮政': 'POSTB',
  '中国邮政': 'POSTB',
  '邮政快递包裹': 'POSTB',
  'EMS': 'EMS',
  '安能': 'ANE56',
  '安能物流': 'ANE56',
  '安能快运': 'ANE56',
  '跨越': 'KYE',
  '跨越速运': 'KYE',
  '顺丰': 'SF',
  '顺丰速运': 'SF',
  '中通': 'ZTO',
  '中通快递': 'ZTO',
  '圆通': 'YTO',
  '圆通速递': 'YTO',
  '申通': 'STO',
  '申通快递': 'STO',
  '韵达': 'YUNDA',
  '韵达速递': 'YUNDA',
};

const mobileRequired = new Set(['SF', 'ZTO']);

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
};

function asObject(value: unknown): PlainObject {
  return value && typeof value === 'object' ? value as PlainObject : {};
}

function toPlainText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  if (Array.isArray(value)) return value.map(toPlainText).filter(Boolean).join('').trim();
  const objectValue = asObject(value);
  for (const key of ['text', 'value', 'title', 'name', 'label']) {
    const item = objectValue[key];
    if (typeof item === 'string' || typeof item === 'number') return String(item).trim();
  }
  return '';
}

function normalizeCarrier(value: unknown): { name: string; code: string } {
  const name = toPlainText(value);
  if (!name || name === '自动识别') return { name: '自动识别', code: '' };
  const code = carrierAliases[name] || carrierAliases[name.toUpperCase()];
  if (code) return { name, code };
  if (/^[A-Za-z0-9_-]{2,64}$/.test(name)) return { name, code: name.toUpperCase() };
  throw new Error(`未识别快递公司“${name}”，请填写阿里云商品的 cpCode，或将该字段留空以自动识别`);
}

function normalizePhone(value: unknown): string {
  const phone = toPlainText(value).replace(/\s+/g, '');
  if (!phone) return '';
  if (!/^\d{4,20}$/.test(phone)) throw new Error('核验手机号必须是完整数字号码或手机号后四位');
  return phone;
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

function errorData(number: string, message: string): ResultData {
  return {
    id: `ERROR:${number || Date.now()}`,
    summary: `查询失败：${message}`,
    trackingNumber: number,
    carrier: '',
    carrierCode: '',
    status: '查询失败',
    latest: message,
    queriedAt: Date.now(),
    trace: '',
  };
}

function successWithMessage(number: string, message: string) {
  return {
    code: FieldCode.Success,
    data: errorData(number, message),
  };
}

basekit.addDomainList(['kzexpress.market.alicloudapi.com']);

basekit.addField({
  i18n: {
    messages: {
      'zh-CN': {
        waybillNumber: '快递单号字段',
        carrier: '快递公司字段（可选）',
        phone: '核验手机号字段（可选）',
        refreshAt: '刷新触发字段（可选）',
        summary: '物流摘要',
        trackingNumber: '快递单号',
        carrierName: '快递公司',
        carrierCode: '快递公司编码',
        status: '物流状态',
        latest: '最新轨迹',
        queriedAt: '查询时间',
        trace: '完整轨迹',
      },
    },
  },
  authorizations: [
    {
      id: AUTHORIZATION_ID,
      platform: 'base',
      type: AuthorizationType.CustomHeaderToken,
      required: true,
      label: '阿里云快递查询 AppCode',
      instructionsUrl: 'https://market.console.aliyun.com/',
      params: {
        headerName: 'Authorization',
      },
      icon: {
        light: '',
        dark: '',
      },
      tooltips: [
        {
          type: 'text',
          content: '请填写完整值：APPCODE 你的AppCode。凭证由飞书托管，不会写入字段捷径代码。',
        },
      ],
    },
  ],
  formItems: [
    {
      key: 'waybillNumber',
      label: t('waybillNumber'),
      component: FieldComponent.FieldSelect,
      props: {
        mode: 'single',
        supportType: [FieldType.Text],
      },
      validator: {
        required: true,
      },
      tooltips: [
        {
          type: 'text',
          content: '请选择保存快递单号的文本字段，单号支持6至32位字母、数字或连字符。',
        },
      ],
    },
    {
      key: 'carrier',
      label: t('carrier'),
      component: FieldComponent.FieldSelect,
      props: {
        mode: 'single',
        supportType: [FieldType.Text, FieldType.SingleSelect],
      },
      validator: {
        required: false,
      },
      tooltips: [
        {
          type: 'text',
          content: '留空时由接口自动识别；也可以填写中文快递公司名称或阿里云商品的cpCode。',
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
      validator: {
        required: false,
      },
      tooltips: [
        {
          type: 'text',
          content: '顺丰、中通等需要手机号核验时，请提供收件人或寄件人的完整手机号或后四位。',
        },
      ],
    },
    {
      key: 'refreshAt',
      label: t('refreshAt'),
      component: FieldComponent.FieldSelect,
      props: {
        mode: 'single',
        supportType: [FieldType.DateTime],
      },
      validator: {
        required: false,
      },
      tooltips: [
        {
          type: 'text',
          content: '物流会随时间变化。可选一个日期字段，修改日期即可强制重新查询同一运单。',
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
        desc: '物流数据由阿里云云市场快递查询商品提供，查询会传输快递单号、快递公司和必要的核验手机号。',
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
      ],
    },
  },
  options: {
    disableAutoUpdate: false,
  },
  execute: async (formItemParams, context) => {
    const trackingNumber = toPlainText(formItemParams.waybillNumber);

    try {
      if (!/^[A-Za-z0-9-]{6,32}$/.test(trackingNumber)) {
        return successWithMessage(trackingNumber, '快递单号必须是6至32位字母、数字或连字符');
      }

      const carrier = normalizeCarrier(formItemParams.carrier);
      const phone = normalizePhone(formItemParams.phone);
      if (mobileRequired.has(carrier.code) && !phone) {
        return successWithMessage(trackingNumber, `${carrier.name}查询需要收件人或寄件人手机号后四位`);
      }

      const body = new URLSearchParams({ expressNo: trackingNumber });
      if (carrier.code) body.set('cpCode', carrier.code);
      if (phone) body.set('mobile', phone);

      const response = await context.fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        body: body.toString(),
      }, AUTHORIZATION_ID);

      const raw = await response.text();
      let payload: PlainObject = {};
      try {
        payload = raw ? asObject(JSON.parse(raw)) : {};
      } catch {
        payload = {};
      }

      if (!response.ok) {
        const detail = `${messageOf(payload, raw.slice(0, 200))} ${response.headers.get('x-ca-error-message') || ''}`.trim();
        if (response.status === 401 || response.status === 403) {
          if (/quota|exhausted|次数|额度/i.test(detail)) return { code: FieldCode.QuotaExhausted };
          return { code: FieldCode.AuthorizationError };
        }
        if (response.status === 429) return { code: FieldCode.RateLimit };
        return successWithMessage(trackingNumber, `物流接口异常（HTTP ${response.status}${detail ? `：${detail}` : ''}）`);
      }

      const success = payload.success === true || String(payload.code) === '200';
      const data = asObject(payload.data);
      if (!success || !Object.keys(data).length) {
        const detail = messageOf(payload, '未知错误');
        if (/quota|exhausted|次数|额度/i.test(detail)) return { code: FieldCode.QuotaExhausted };
        if (/手机号|mobile|验证/i.test(detail)) return successWithMessage(trackingNumber, '手机号后四位核验失败，请检查核验手机号');
        if (/无轨迹|未查询|不存在|暂无/i.test(detail)) return successWithMessage(trackingNumber, '暂未查询到物流轨迹，请检查单号、快递公司及是否已经发货');
        return successWithMessage(trackingNumber, `阿里云快递查询失败：${detail}`);
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
      const providerCarrierCode = String(data.cpCode || carrier.code || '');
      const providerCarrier = String(data.logisticsCompanyName || providerCarrierCode || carrier.name || '自动识别');
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
        trackingNumber,
      }));
      return successWithMessage(trackingNumber, message || '未知错误');
    }
  },
});

export default basekit;
