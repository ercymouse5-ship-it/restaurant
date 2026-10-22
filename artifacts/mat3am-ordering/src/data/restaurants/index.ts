import furnElhara from './furn-elhara';
import type { Restaurant } from '../types';

export const restaurants: Restaurant[] = [furnElhara];
export const getRestaurant = (slug: string) => restaurants.find((restaurant) => restaurant.slug === slug);
