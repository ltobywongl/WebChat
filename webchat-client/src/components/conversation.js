
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export default function Conversation({id}) {
  return (
    <>
      <div className='conversation'>
        ID: {id}
      </div>
    </>
  )
}
