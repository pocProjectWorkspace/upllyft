// src/events/events.controller.ts (in API workspace)

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';
import { MarkInterestDto } from './dto/event-interest.dto';


import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) { }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'List events' })
  async listEvents(@Query() query: QueryEventsDto, @Request() req) {
    const userId = req.user?.id || null;
    return this.eventsService.listEvents(query, userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create event' })
  async createEvent(@Body() createEventDto: CreateEventDto, @Request() req) {
    return this.eventsService.createEvent(req.user.id, createEventDto);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get event details' })
  async getEvent(@Param('id') id: string, @Request() req) {
    const userId = req.user?.id || null;
    return this.eventsService.getEvent(id, userId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update event' })
  async updateEvent(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
    @Request() req,
  ) {
    return this.eventsService.updateEvent(req.user.id, id, updateEventDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete event' })
  async deleteEvent(@Param('id') id: string, @Request() req) {
    return this.eventsService.deleteEvent(req.user.id, id);
  }

  @Post(':id/interest')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark interest in event' })
  async markInterest(
    @Param('id') id: string,
    @Body() markInterestDto: MarkInterestDto,
    @Request() req,
  ) {
    return this.eventsService.markInterest(req.user.id, id, markInterestDto);
  }

  @Delete(':id/interest')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove interest from event' })
  async removeInterest(@Param('id') id: string, @Request() req) {
    return this.eventsService.removeInterest(req.user.id, id);
  }
}
