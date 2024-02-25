interface FetcherConstructorOption<RouteStructure> {
    routeStructure: RouteStructure
    baseUrl: string
}
export class APIFetcher<RouteStructure> {
    private baseUrl: string
    public static fetchPrefix = 'api'

    public constructor({
        baseUrl, // routeStructure,
    }: FetcherConstructorOption<RouteStructure>) {
        this.baseUrl = baseUrl
    }

    public async get(
        path: RequestInfo | URL,
        option?: Omit<RequestInit, 'method'>
    ): Promise<RouteStructure> {
        try {
            const response = await fetch(
                `${APIFetcher.fetchPrefix}/${this.baseUrl}${path}`,
                {
                    ...option,
                    method: 'GET',
                }
            )
            const json = (await response.json()) as RouteStructure

            return json
        } catch (e: unknown) {
            throw new Error(typeof e === 'string' ? e : 'Unknown error')
        }
    }
}
