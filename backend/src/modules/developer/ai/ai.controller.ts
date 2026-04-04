import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Res,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { AiService } from './ai.service';

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  message: string;
}

export class CreateConversationDto {
  @IsString()
  @MinLength(1)
  firstMessage: string;
}

@ApiTags('Developer AI')
@Controller('api/developer/ai')
export class AiController {
  constructor(private aiService: AiService) {}

  /**
   * POST /api/developer/ai/conversations
   * Create a new conversation and return its ID + title.
   */
  @Post('conversations')
  @ApiOperation({ summary: 'Create a new AI conversation' })
  async createConversation(@Body() dto: CreateConversationDto) {
    try {
      return await this.aiService.createConversation(dto.firstMessage);
    } catch (err) {
      throw new HttpException(
        { message: 'Failed to create conversation', error: err instanceof Error ? err.message : String(err) },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/developer/ai/conversations
   * List recent conversations.
   */
  @Get('conversations')
  @ApiOperation({ summary: 'List AI conversations' })
  async listConversations() {
    return this.aiService.listConversations();
  }

  /**
   * GET /api/developer/ai/conversations/:id/messages
   * Fetch all messages in a conversation.
   */
  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get messages for a conversation' })
  async getMessages(@Param('id') id: string) {
    return this.aiService.getMessages(id);
  }

  /**
   * DELETE /api/developer/ai/conversations/:id
   * Clear chat history for a conversation.
   */
  @Delete('conversations/:id')
  @ApiOperation({ summary: 'Clear a conversation' })
  async clearConversation(@Param('id') id: string) {
    await this.aiService.clearConversation(id);
    return { cleared: true };
  }

  /**
   * POST /api/developer/ai/conversations/:id/messages/stream
   * SSE streaming endpoint — streams the AI response in real time.
   *
   * SSE event format:
   *   event: delta      → { text: string }           — partial text token
   *   event: diff       → { path, before, after }    — file diff
   *   event: status     → { status, tools? }         — thinking / executing / restarting
   *   event: done       → { text: string }           — final complete response
   *   event: error      → { message: string }        — error
   *   event: end        → {}                         — stream closed
   */
  @Post('conversations/:id/messages/stream')
  @ApiOperation({ summary: 'Send a message and stream AI response (SSE)' })
  async streamMessage(
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    const send = (event: string, data: string) => {
      if (!res.writableEnded) {
        res.write(`event: ${event}\ndata: ${data}\n\n`);
      }
    };

    try {
      await this.aiService.streamChat(id, dto.message, send);
    } catch (err) {
      send('error', JSON.stringify({ message: err instanceof Error ? err.message : 'AI stream error' }));
    } finally {
      if (!res.writableEnded) {
        res.end();
      }
    }
  }
}
