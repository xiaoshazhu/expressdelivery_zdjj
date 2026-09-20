import assert from 'node:assert/strict';
import {
  basekit,
  createFieldContext,
  FieldCode,
  FieldContext,
} from '@lark-opdev/block-basekit-server-api';
import '../src/index';

async function run() {
  let requestAuthorizationId = '';
  let requestBody = '';

  const context = await createFieldContext({
    timeZone: 'Asia/Shanghai',
    fetch: async (_url, init, authorizationId) => {
      requestAuthorizationId = authorizationId || '';
      requestBody = String(init?.body || '');
      return new Response(JSON.stringify({
        success: true,
        code: 200,
        data: {
          cpCode: 'SF',
          mailNo: 'SF1234567890',
          logisticsCompanyName: '顺丰速运',
          logisticsStatusDesc: '已签收',
          theLastMessage: '您的快件已签收',
          logisticsTraceDetailList: [
            {
              time: 1718849806000,
              desc: '您的快件已签收',
              areaName: '宁波市',
            },
            {
              time: 1718767062000,
              desc: '顺丰速运已收取快件',
              areaName: '温州市',
            },
          ],
        },
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
  }) as FieldContext;

  assert.ok(basekit.field, '字段捷径未注册');
  const result = await basekit.field.execute({
    waybillNumber: [{ type: 'text', text: 'SF1234567890' }],
    carrier: '顺丰',
    phone: [{ type: 'text', text: '1234' }],
    refreshAt: Date.now(),
  }, context) as { code: number; data: Record<string, unknown> };

  assert.equal(result.code, FieldCode.Success);
  assert.equal(result.data.status, '已签收');
  assert.equal(result.data.carrierCode, 'SF');
  assert.match(String(result.data.trace), /您的快件已签收/);
  assert.equal(requestAuthorizationId, 'aliyun_appcode');
  assert.match(requestBody, /expressNo=SF1234567890/);
  assert.match(requestBody, /mobile=1234/);
  assert.match(requestBody, /cpCode=SF/);

  const missingPhone = await basekit.field.execute({
    waybillNumber: [{ type: 'text', text: 'SF1234567890' }],
    carrier: '顺丰',
    phone: [],
  }, context) as { code: number; data: Record<string, unknown> };
  assert.equal(missingPhone.code, FieldCode.Success);
  assert.match(String(missingPhone.data.summary), /手机号后四位/);

  console.log('字段捷径模拟测试通过');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
