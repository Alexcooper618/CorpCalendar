import { Controller, Get } from '@nestjs/common';

interface ProductItem {
  id: string;
  title: string;
  productOwner?: string;
  cluster?: string;
  plannedCsiDate?: string;
}

const PRODUCTS: ProductItem[] = [
  {
    id: 'p1',
    title: 'Корпоративный портал',
    productOwner: 'Иван Петров',
    cluster: 'Внутренние сервисы',
    plannedCsiDate: '2025-02-10',
  },
  {
    id: 'p2',
    title: 'Мобильное приложение клиентов',
    productOwner: 'Алина Смирнова',
    cluster: 'Витрина и мобильные каналы',
    plannedCsiDate: '2025-03-18',
  },
  {
    id: 'p3',
    title: 'Платформа аналитики',
    productOwner: 'Дмитрий Жуков',
    cluster: 'Данные и аналитика',
    plannedCsiDate: '2025-04-05',
  },
  {
    id: 'p4',
    title: 'Интернет-банк',
    productOwner: 'Екатерина Орлова',
    cluster: 'Дистанционное обслуживание',
  },
  {
    id: 'p5',
    title: 'Система обучения сотрудников',
    productOwner: 'Руслан Абрамов',
    cluster: 'HR Tech',
  },
];

@Controller('products')
export class ProductsController {
  @Get()
  findAll(): ProductItem[] {
    return PRODUCTS;
  }
}

