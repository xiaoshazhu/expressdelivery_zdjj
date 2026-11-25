import assert from 'node:assert/strict';
import { basekit, createFieldContext, FieldCode, FieldContext, FieldType } from '@lark-opdev/block-basekit-server-api';
import '../src/index';

type Output = { code: number; data: Record<string, unknown> };

async function run() {
  const requests: URLSearchParams[] = [];
  const context = await createFieldContext({
    timeZone: 'Asia/Shanghai',
    tenantKey: 'tenant-test-1',
    isNeedPayPack: true,
    hasQuota: true,
    packID: 'replit_test',
    baseSignature: 'fixture.signature',
    fetch: async (url, init, authorizationId) => {
      const address = String(url);
      assert.equal(address, 'https://express-delivery.anhuishuzhi.com/field/api/express/query');
      assert.equal(authorizationId, undefined);
      const headers = new Headers(init?.headers);
      assert.equal(headers.get('X-Feishu-Pack-Id'), 'replit_test');
      assert.equal(headers.get('X-Feishu-Base-Signature'), 'fixture.signature');
      const body = new URLSearchParams(String(init?.body || ''));
      requests.push(body);
      if (body.get('expressNo') === 'SFNOQUOTA') {
        return new Response(JSON.stringify({ usedQuota: 15, maxQuota: 15, payUrl: 'https://example.invalid/field/pay' }), { status: 402 });
      }
      if (body.get('expressNo') === 'SFHTTPERROR') {
        return new Response(JSON.stringify({ message: '手机号与运单不匹配' }), { status: 400 });
      }
      if (body.get('expressNo') === 'SFFALSE200') {
        return new Response(JSON.stringify({ success: false, code: 200, message: '手机号与运单不匹配', data: { logisticsStatusDesc: '已签收' } }));
      }
      if (body.get('mobile') !== '13800138899' && body.get('cpCode') === 'SF') {
        return new Response(JSON.stringify({ success: false, code: 400, message: '手机号与运单不匹配' }));
      }
      return new Response(JSON.stringify({
        success: true,
        code: 200,
        data: {
          cpCode: body.get('cpCode') || 'SF',
          mailNo: body.get('expressNo'),
          logisticsCompanyName: '顺丰速运',
          logisticsStatusDesc: '已签收',
          theLastMessage: '快件已签收',
          receiverPhone: '139****8899',
          logisticsTraceDetailList: [{ time: 1718849806000, desc: '快件已签收' }],
        },
      }));
    },
  }) as FieldContext;
  assert.ok(basekit.field);
  assert.equal(basekit.field.authorizations?.length ?? 0, 0, '不能要求用户关联阿里云账号');
  const refreshField = basekit.field.formItems.find(item => item.key === 'refreshAt');
  assert.ok(refreshField);
  const messages = basekit.field.i18n?.messages['zh-CN'] as Record<string, unknown>;
  assert.equal(messages.refreshAt, '按时更新字段（多选）');
  assert.equal(refreshField.props.mode, 'multiple');
  assert.ok((refreshField.props.supportType as FieldType[]).includes(FieldType.DateTime));
  assert.deepEqual(refreshField.defaultValue, ['快递单号', '核验手机号'], '不得默认绑定定时刷新列');
  assert.equal(basekit.field.options?.disableAutoUpdate, false);
  const query = async (waybillNumber: string, phone?: unknown) =>
    await basekit.field.execute({ waybillNumber, phone }, context) as Output;

  const good = await query('SF9999888877', [{ type: 'text', text: '13800138899' }]);
  assert.equal(good.code, FieldCode.Success);
  assert.equal(good.data.status, '已签收');
  assert.equal(requests[0].get('expressNo'), 'SF9999888877');
  assert.equal(requests[0].get('mobile'), '13800138899');
  assert.equal(requests[0].get('cpCode'), 'SF');
  assert.equal(requests[0].get('tenantKey'), 'tenant-test-1');
  const beforeExhausted = requests.length;
  const exhaustedContext = await createFieldContext({ ...context, hasQuota: false }) as FieldContext;
  const exhausted = await basekit.field.execute({ waybillNumber: 'SF9999888877', phone: '13800138899' }, exhaustedContext);
  assert.deepEqual(exhausted, { code: FieldCode.FeishuPaidBenefitsExhausted });
  assert.equal(requests.length, beforeExhausted, '飞书付费权益用尽时不得发起物流查询');

  // 模拟飞书工作流更新日期列后发起的一次字段重算。调度本身由飞书负责。
  const scheduledStart = requests.length;
  const scheduled = await basekit.field.execute({
    waybillNumber: 'SF9999888877',
    phone: '13800138899',
    refreshAt: ['SF9999888877', '13800138899', Date.parse('2026-11-25T08:00:00+08:00')],
  }, context) as Output;
  assert.equal(scheduled.code, FieldCode.Success);
  assert.equal(scheduled.data.status, '已签收');
  assert.equal(requests.length, scheduledStart + 1, '每次重算只发起一次物流请求');
  assert.equal(requests[scheduledStart].toString(), requests[0].toString(), '不将调度日期作为物流请求参数');

  await basekit.field.execute({ waybillNumber: 'JD1234567890', carrier: '圆通' }, context);
  assert.equal(requests[requests.length - 1].get('cpCode'), 'YTO', '保留的快递公司字段仍应影响查询');
  const noTenantContext = await createFieldContext({ ...context, tenantKey: '' }) as FieldContext;
  const beforeNoTenant = requests.length;
  const noTenant = await basekit.field.execute({ waybillNumber: 'JD1234567890' }, noTenantContext) as Output;
  assert.equal(noTenant.code, FieldCode.ConfigError);
  assert.equal(requests.length, beforeNoTenant, '缺少租户标识时不得请求服务端或使用共享额度');
  assert.doesNotMatch(String(good.data.summary), /手机核验通过/);
  assert.doesNotMatch(String(good.data.trace), /手机核验通过/);

  const beforeInvalid = requests.length;
  const missing = await query('SF9999888877');
  assert.equal(missing.data.status, '待补全手机号');
  for (const invalid of ['8899', '138****8899', '11111111111', '1380013889', '138001388990']) {
    const result = await query('SF9999888877', invalid);
    assert.equal(result.data.status, '手机号格式有误', invalid);
  }
  assert.equal(requests.length, beforeInvalid, '缺失或无效手机号不得调用快递查询接口');

  const wrong = await query('SF9999888877', '13900138899');
  assert.equal(wrong.data.status, '手机号核验失败');
  assert.equal(requests[requests.length - 1]?.get('mobile'), '13900138899');
  assert.match(String(wrong.data.summary), /手机号与运单不匹配/);

  const normalized = await query('SF9999888877', { fullPhone: '+86 138-0013-8899' });
  assert.equal(normalized.data.status, '已签收');
  assert.equal(requests[requests.length - 1]?.get('mobile'), '13800138899');

  const badWaybill = await query('123', '13800138899');
  assert.equal(badWaybill.data.status, '单号格式有误');

  // 演示单号也必须查询阿里云，不能从本地模拟数据绕过手机号判断。
  const demo = await query('SF123456789012', '13900138899');
  assert.equal(demo.data.status, '手机号核验失败');
  assert.equal(requests[requests.length - 1]?.get('expressNo'), 'SF123456789012');

  assert.equal((await query('SFHTTPERROR', '13800138899')).data.status, '手机号核验失败');
  assert.equal((await query('SFFALSE200', '13800138899')).data.status, '手机号核验失败');
  const quota = await query('SFNOQUOTA', '13800138899');
  assert.deepEqual(quota, { code: FieldCode.Error }, '不显示开发商次数，也不把上游错误当作飞书额度用完');

  console.log('快递单号与完整手机号请求及接口核验测试通过');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
