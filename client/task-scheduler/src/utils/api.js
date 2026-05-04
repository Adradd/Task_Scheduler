export function extractApiErrorMessage(error, fallback = 'Unknown error') {
    return error?.response?.data?.error
        || error?.response?.data?.message
        || error?.message
        || fallback;
}
