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
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ServiceCategoriesService } from './service-categories.service';
import { CreateServiceCategoryDto } from './dto/create-service-category.dto';
import { UpdateServiceCategoryDto } from './dto/update-service-category.dto';

@Controller('service-categories')
export class ServiceCategoriesController {
  constructor(
    private readonly serviceCategoriesService: ServiceCategoriesService,
  ) {}

  @Get()
  async findAll(@Query('includeInactive') includeInactive?: string) {
    const include = includeInactive === 'true';
    return this.serviceCategoriesService.findAll(include);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.serviceCategoriesService.findOne(id);
  }

  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.serviceCategoriesService.findBySlug(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createDto: CreateServiceCategoryDto) {
    return this.serviceCategoriesService.create(createDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateServiceCategoryDto,
  ) {
    return this.serviceCategoriesService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string) {
    await this.serviceCategoriesService.remove(id);
    return { message: 'Service category deleted successfully' };
  }

  @Put('reorder')
  @UseGuards(JwtAuthGuard)
  async reorder(@Body() body: { categoryIds: string[] }) {
    await this.serviceCategoriesService.updateDisplayOrder(body.categoryIds);
    return { message: 'Display order updated successfully' };
  }
}
