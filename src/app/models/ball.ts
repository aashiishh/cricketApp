export interface Ball {
    baller: string,
    batsman: string,
    caught_by?: string,
    run: string,//"0/1/2/4/6"
    status: string,//"wicket/dot/wide/no ball/runs"
    display?: string,
    batsman_runs?: string,
    extra_runs?: string,
    dismissed_batsman?: string,
    wicket_type?: string,//"catch/bowled/other"
    free_hit?: boolean
}
