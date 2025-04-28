export const waitForMs = (t: number): Promise<void> => {
    return new Promise<void>((resolve) => {
        setTimeout(() => {
            resolve()
        }, t)
    })
}