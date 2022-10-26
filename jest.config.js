module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    verbose: true,
    moduleDirectories: ['node_modules'],
    transform: {
        '^.+\\.(ts|tsx)?$': 'ts-jest',
        "^.+\\.(js|jsx)$": "babel-jest"
    },
    transformIgnorePatterns: [
        'node_modules/(?!(ol)/).*/'
    ],
    setupFiles: [
        "jsdom-worker"
    ]
};
