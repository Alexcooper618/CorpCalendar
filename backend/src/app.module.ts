import { Module } from '@nestjs/common';
import { DatabaseModule } from './database.module';
import { EventsModule } from './events/events.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [DatabaseModule, EventsModule, ProductsModule],
})
export class AppModule {}
