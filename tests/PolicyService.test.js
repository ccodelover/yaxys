const PolicyService = require ("../core/services/PolicyService.js");
global.AuthService = require ("../core/services/AuthService.js");
global._ = require("lodash");

describe ("PolicyService", () => {
  describe ("check and inject operator", () => {
    const testCases = [
      {
        title: "Correct token",
        operator: {
          id: 55,
          email: "test@email.com"
        },
        token: AuthService.generateToken({id: 55, email: "test@email.com"}),
        error: false
      },
      {
        title: "Incorrect token",
        operator: {
          id: 55,
          email: "test@email.com"
        },
        token: "some_wrong_token",
        error: true
      }
    ];
    testCases.forEach(testCase => it(testCase.title, () => {
      const mockThrow = jest.fn();
      const mockNext = jest.fn();
      let mockCtx = {
        cookies: {
          get: () => testCase.token
        },
        throw: mockThrow,
        operator: null
      };
      PolicyService.checkAndInjectOperator(mockCtx, mockNext);
      if (testCase.error) {
        expect(mockThrow.mock.calls.length).toBe(1);
        expect(mockNext.mock.calls.length).toBe(0);
        expect(mockThrow.mock.calls[0][0]).toBe(401);
        expect(mockThrow.mock.calls[0][1]).toBe("unauthorized");
        expect(mockCtx.operator).toBeNull();
      } else {
        expect(mockNext.mock.calls.length).toBe(1);
        expect(mockThrow.mock.calls.length).toBe(0);
        expect(mockCtx.operator.id).toBe(testCase.operator.id);
        expect(mockCtx.operator.email).toBe(testCase.operator.email);
        expect(mockCtx.operator.exp).toBeGreaterThan(Date.now()/1000);
      }
    }));
  })
});
