import { twMerge } from 'tailwind-merge'
import Container from './Container'
import ProductCard from './ProductCard'
import Title from './Title'
import { Link } from 'react-router-dom'



interface Props {
    title: string,
    path: string,
    className: string,
}

const ProductList = ({ title, path, className }: Props) => {
    const newClass = twMerge('', className);
    return (
        <Container>
            <div className={newClass}>
                <div className="flex items-center justify-between">
                    <Title text={title} className='text-white' />
                    <Link to={path} className='text-white'>View All</Link>
                </div>
                {/* <div className="w-full h-[1px] bg-gray-200 mt-2" /> */}
                <div className="grid gap-4 md:gap-5 lg:gap-5 grid-cols-2 lg:grid-cols-5 mt-8 md:mt-10 lg:mt-10 ">
                    <ProductCard />
                    <ProductCard />
                    <ProductCard />
                    <ProductCard />
                    <ProductCard />
                </div>
            </div>
        </Container>
    )
}

export default ProductList