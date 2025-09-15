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
import { PaginatedResponse } from './dto/pagination-response.dto';
import { Service } from './entities/service.entity';
import { Rating } from './entities/rating.entity';
// import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('services')
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
//   @UseGuards(JwtAuthGuard)
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
//   @UseGuards(JwtAuthGuard)
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
//   @UseGuards(JwtAuthGuard)
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
  // @UseGuards(JwtAuthGuard)
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
}