jest.mock("@sentry/react-native", () => ({
    init: jest.fn(),
    setTag: jest.fn(),
    addBreadcrumb: jest.fn(),
    captureException: jest.fn(),
    setUser: jest.fn(),
}));
