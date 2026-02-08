import { Controller, Get } from '@nestjs/common';
import { StatsService, StatsResponse } from './stats.service';

@Controller('stats')
export class StatsController {
    constructor(private readonly statsService: StatsService) { }

    @Get()
    getStats(): Promise<StatsResponse> {
        return this.statsService.getStats();
    }
}
