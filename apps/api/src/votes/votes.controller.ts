// apps/api/src/votes/votes.controller.ts
import {
  Controller,
  Post,
  Body,
  Delete,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { VotesService } from './votes.service';
import { CreateVoteDto } from './dto/create-vote.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('votes')
export class VotesController {
  constructor(private readonly votesService: VotesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async createOrUpdate(@Request() req: any, @Body() createVoteDto: CreateVoteDto) {
    const vote = await this.votesService.createOrUpdate(req.user.id, createVoteDto);
    return {
      success: true,
      vote,
      message: vote ? 'Vote recorded' : 'Vote removed',
    };
  }

  @Get('user')
  @UseGuards(JwtAuthGuard)
  async getUserVotes(
    @Request() req: any,
    @Query('targetType') targetType?: 'post' | 'comment',
  ) {
    return this.votesService.getUserVotes(req.user.id, targetType);
  }

  @Get(':targetType/:targetId')
  async getTargetVotes(
    @Param('targetType') targetType: 'post' | 'comment',
    @Param('targetId') targetId: string,
  ) {
    return this.votesService.getTargetVotes(targetId, targetType);
  }

  @Delete(':targetType/:targetId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeVote(
    @Request() req: any,
    @Param('targetType') targetType: 'post' | 'comment',
    @Param('targetId') targetId: string,
  ) {
    await this.votesService.removeVote(req.user.id, targetId, targetType);
  }
}
