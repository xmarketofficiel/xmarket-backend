import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { ServicesService } from '../services/services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { SearchServicesDto } from './dto/search-services.dto';
import { CreateRatingDto } from './dto/create-rating.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactStatusDto } from './dto/update-contact-status.dto';
import { PaginatedResponse } from './dto/pagination-response.dto';
import { Service } from './entities/service.entity';
import { Rating } from './entities/rating.entity';
import { ContactEvent } from './entities/contact-event.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('services')
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new service' })
  @ApiResponse({
    status: 201,
    description: 'Service created successfully',
    type: Service,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @Body() createServiceDto: CreateServiceDto,
    @Request() req,
  ): Promise<Service> {
    return await this.servicesService.create(createServiceDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Search and list services with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Services retrieved successfully',
    type: PaginatedResponse<Service>,
  })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'search', required: false, description: 'Search in title and description' })
  @ApiQuery({ name: 'location', required: false, description: 'Filter by location' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 10 })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort by field', example: 'createdAt' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort order', example: 'DESC' })
  async findAll(@Query() searchDto: SearchServicesDto): Promise<PaginatedResponse<Service>> {
    return await this.servicesService.findAll(searchDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get service by ID' })
  @ApiParam({ name: 'id', description: 'Service UUID' })
  @ApiResponse({
    status: 200,
    description: 'Service retrieved successfully',
    type: Service,
  })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Service> {
    return await this.servicesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update service' })
  @ApiParam({ name: 'id', description: 'Service UUID' })
  @ApiResponse({
    status: 200,
    description: 'Service updated successfully',
    type: Service,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not service owner' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateServiceDto: UpdateServiceDto,
    @Request() req,
  ): Promise<Service> {
    return await this.servicesService.update(id, updateServiceDto, req.user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete service (soft delete)' })
  @ApiParam({ name: 'id', description: 'Service UUID' })
  @ApiResponse({ status: 200, description: 'Service deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not service owner' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ): Promise<{ message: string }> {
    await this.servicesService.remove(id, req.user.id);
    return { message: 'Service deleted successfully' };
  }

  @Post(':id/ratings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add rating to service' })
  @ApiParam({ name: 'id', description: 'Service UUID' })
  @ApiResponse({
    status: 201,
    description: 'Rating added successfully',
    type: Rating,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot rate own service' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async addRating(
    @Param('id', ParseUUIDPipe) serviceId: string,
    @Body() createRatingDto: CreateRatingDto,
    @Request() req,
  ): Promise<Rating> {
    return await this.servicesService.addRating(serviceId, createRatingDto, req.user.id);
  }

  @Get(':id/ratings')
  @ApiOperation({ summary: 'Get service ratings with pagination' })
  @ApiParam({ name: 'id', description: 'Service UUID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Ratings retrieved successfully',
    type: PaginatedResponse<Rating>,
  })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async getServiceRatings(
    @Param('id', ParseUUIDPipe) serviceId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
  ): Promise<PaginatedResponse<Rating>> {
    return await this.servicesService.getServiceRatings(serviceId, page, limit);
  }

  // ============= CONTACT TRACKING ENDPOINTS =============

  @Post('contact')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Log contact with seller and get WhatsApp number' })
  @ApiResponse({
    status: 201,
    description: 'Contact logged successfully, returns WhatsApp number',
    schema: {
      type: 'object',
      properties: {
        contactEvent: { type: 'object' },
        whatsappNumber: { type: 'string' },
        sellerName: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Service or seller not found' })
  async logContact(
    @Body() createContactDto: CreateContactDto,
    @Request() req,
  ) {
    return await this.servicesService.logContactEvent(createContactDto, req.user.id);
  }

  @Patch('contacts/:contactId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update contact status (e.g., completed, cancelled)' })
  @ApiParam({ name: 'contactId', description: 'Contact event UUID' })
  @ApiResponse({
    status: 200,
    description: 'Contact status updated successfully',
    type: ContactEvent,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Contact event not found' })
  async updateContactStatus(
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Body() updateDto: UpdateContactStatusDto,
    @Request() req,
  ): Promise<ContactEvent> {
    return await this.servicesService.updateContactStatus(contactId, updateDto, req.user.id);
  }

  @Get('contacts/history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user contact history' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Contact history retrieved successfully',
    type: PaginatedResponse<ContactEvent>,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getContactHistory(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
    @Request() req,
  ): Promise<PaginatedResponse<ContactEvent>> {
    return await this.servicesService.getUserContactHistory(req.user.id, page, limit);
  }

  @Get('contacts/follow-up')
  @ApiOperation({ summary: 'Get contacts needing follow-up (internal use)' })
  @ApiResponse({
    status: 200,
    description: 'Contacts needing follow-up retrieved successfully',
    type: [ContactEvent],
  })
  async getContactsNeedingFollowUp(): Promise<ContactEvent[]> {
    return await this.servicesService.getContactsNeedingFollowUp();
  }
}