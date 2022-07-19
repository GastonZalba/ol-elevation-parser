export let loggerIsEnabled = false;

export const setLoggerActive = (bool: boolean) => {
    loggerIsEnabled = bool;
};

export default function logger(...args) {
    if (loggerIsEnabled) console.log(...args);
}
