
export default {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    verbose: true,
    moduleDirectories: ['node_modules'],
    transform: {
        '^.+\\.[tj]sx?$': [
            'ts-jest'
        ]
    },
    transformIgnorePatterns: [
        'node_modules\/(?!(ol)\/).*\/'
    ]
};

