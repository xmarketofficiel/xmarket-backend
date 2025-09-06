import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
  ) {}

  async getConversations(userId: number) {
    const conversations = await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.participantOne', 'participantOne')
      .leftJoinAndSelect('conversation.participantTwo', 'participantTwo')
      .leftJoinAndSelect('conversation.item', 'item')
      .leftJoinAndSelect('conversation.messages', 'lastMessage')
      .where('conversation.participantOneId = :userId OR conversation.participantTwoId = :userId', { userId })
      .orderBy('conversation.lastMessageAt', 'DESC')
      .getMany();

    // Transform for frontend compatibility
    return {
      success: true,
      data: conversations.map(conv => ({
        id: conv.id,
        otherParticipant: conv.getOtherParticipant(userId),
        item: conv.item,
        lastMessage: conv.messages?.[0] || null,
        unreadCount: conv.getUnreadCountForUser(userId),
        updatedAt: conv.updatedAt,
      })),
    };
  }

  async getConversation(conversationId: string, userId: number) {
    const conversation = await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.participantOne', 'participantOne')
      .leftJoinAndSelect('conversation.participantTwo', 'participantTwo')
      .leftJoinAndSelect('conversation.item', 'item')
      .where('conversation.id = :conversationId', { conversationId })
      .andWhere('(conversation.participantOneId = :userId OR conversation.participantTwoId = :userId)', { userId })
      .getOne();

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return {
      success: true,
      data: {
        id: conversation.id,
        otherParticipant: conversation.getOtherParticipant(userId),
        item: conversation.item,
        unreadCount: conversation.getUnreadCountForUser(userId),
      },
    };
  }

  async getMessages(conversationId: string, userId: number, page = 1, limit = 50) {
    // Verify user has access to conversation
    const conversation = await this.conversationRepository
      .findOne({
        where: { 
          id: conversationId,
        },
      });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.participantOneId !== userId && conversation.participantTwoId !== userId) {
      throw new ForbiddenException('Access denied to this conversation');
    }

    const [messages, total] = await this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .where('message.conversationId = :conversationId', { conversationId })
      .orderBy('message.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      success: true,
      data: {
        items: messages.reverse(), // Reverse to show oldest first
        total,
        page,
        limit,
        hasMore: total > page * limit,
      },
    };
  }

  async sendMessage(conversationId: string, sendMessageDto: SendMessageDto, userId: number) {
    // Verify user has access to conversation
    const conversation = await this.conversationRepository
      .findOne({
        where: { id: conversationId },
      });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.participantOneId !== userId && conversation.participantTwoId !== userId) {
      throw new ForbiddenException('Access denied to this conversation');
    }

    // Create message
    const message = this.messageRepository.create({
      conversationId,
      senderId: userId,
      content: sendMessageDto.content,
    });

    const savedMessage = await this.messageRepository.save(message);

    // Update conversation last message time and unread counts
    const isParticipantOne = conversation.participantOneId === userId;
    await this.conversationRepository.update(conversationId, {
      lastMessageAt: new Date(),
      ...(isParticipantOne ? 
        { participantTwoUnreadCount: conversation.participantTwoUnreadCount + 1 } :
        { participantOneUnreadCount: conversation.participantOneUnreadCount + 1 }
      ),
    });

    // Fetch the complete message with sender info
    const completeMessage = await this.messageRepository
      .findOne({
        where: { id: savedMessage.id },
        relations: ['sender'],
      });

    return {
      success: true,
      data: completeMessage,
    };
  }

  async createConversation(createConversationDto: CreateConversationDto, userId: number) {
    const participantId = parseInt(createConversationDto.participantId);
    const itemId = createConversationDto.itemId ? parseInt(createConversationDto.itemId) : null;

    // Check if conversation already exists
    let existingConversation = await this.conversationRepository
      .createQueryBuilder('conversation')
      .where(
        '((conversation.participantOneId = :userId AND conversation.participantTwoId = :participantId) OR (conversation.participantOneId = :participantId AND conversation.participantTwoId = :userId))',
        { userId, participantId }
      )
      .andWhere(itemId ? 'conversation.itemId = :itemId' : 'conversation.itemId IS NULL', { itemId })
      .getOne();

    if (existingConversation) {
      return this.getConversation(existingConversation.id, userId);
    }

    // Create new conversation
    const conversation = this.conversationRepository.create({
      participantOneId: userId,
      participantTwoId: participantId,
      itemId,
      lastMessageAt: new Date(),
    });

    const savedConversation = await this.conversationRepository.save(conversation);
    return this.getConversation(savedConversation.id, userId);
  }

  async markAsRead(conversationId: string, userId: number) {
    const conversation = await this.conversationRepository
      .findOne({
        where: { id: conversationId },
      });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.participantOneId !== userId && conversation.participantTwoId !== userId) {
      throw new ForbiddenException('Access denied to this conversation');
    }

    // Reset unread count for this user
    const isParticipantOne = conversation.participantOneId === userId;
    await this.conversationRepository.update(conversationId, {
      ...(isParticipantOne ? 
        { participantOneUnreadCount: 0 } :
        { participantTwoUnreadCount: 0 }
      ),
    });

    // Mark all messages in this conversation as read for this user
    await this.messageRepository
      .createQueryBuilder()
      .update(Message)
      .set({ isRead: true, readAt: new Date() })
      .where('conversationId = :conversationId', { conversationId })
      .andWhere('senderId != :userId', { userId })
      .andWhere('isRead = false')
      .execute();

    return {
      success: true,
      message: 'Conversation marked as read',
    };
  }

  async deleteConversation(conversationId: string, userId: number) {
    const conversation = await this.conversationRepository
      .findOne({
        where: { id: conversationId },
      });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.participantOneId !== userId && conversation.participantTwoId !== userId) {
      throw new ForbiddenException('Access denied to this conversation');
    }

    // Delete all messages first
    await this.messageRepository.delete({ conversationId });
    
    // Delete conversation
    await this.conversationRepository.delete(conversationId);

    return {
      success: true,
      message: 'Conversation deleted successfully',
    };
  }
}
