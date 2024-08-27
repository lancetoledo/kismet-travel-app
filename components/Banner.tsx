'use client'

import { useState } from 'react'

export default function Banner() {
  const [origin, setOrigin] = useState('Newark Airport')
  const [destination, setDestination] = useState('Haneda Airport')
  const [departDate, setDepartDate] = useState('April, 17th')
  const [returnDate, setReturnDate] = useState('Dec, 24th')
  const [passengers, setPassengers] = useState('2 passengers')

  return (
    <div className="flex flex-col w-full h-96 bg-[#78c678] rounded-2xl p-[50px] gap-[30px]">
      <div className="w-6/12">
        <h1 className="text-6xl text-white font-semibold pr-11 leading-none">Explore New Places</h1>
        <p className="text-3xl text-white">Go where you are meant to be</p>
      </div>
      <div className="w-4/5">
        <div className="flex">
          <div className="bg-neutral-900 text-white w-40 h-12 flex justify-center items-center rounded-t-xl font-semibold">
            Flights
          </div>
        </div>
        <div className="flex h-20 w-full bg-white rounded-b-xl rounded-tr-xl">
          <InputContainer icon="🏠" title="Origin" value={origin} onChange={setOrigin} />
          <InputContainer icon="🏝️" title="Destination" value={destination} onChange={setDestination} />
          <DateContainer title="Depart" value={departDate} onChange={setDepartDate} />
          <DateContainer title="Return" value={returnDate} onChange={setReturnDate} />
          <PassengerContainer value={passengers} onChange={setPassengers} />
          <div className="flex justify-center items-center w-44">
            <button className="bg-orange-500 w-28 h-14 flex justify-center items-center text-xl text-white font-semibold rounded-xl cursor-pointer">
              Search
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function InputContainer({ icon, title, value, onChange }) {
  return (
    <div className="flex items-center justify-center w-44 gap-2 p-[8px]">
      <span className="w-6 h-6 opacity-50">{icon}</span>
      <div className="flex flex-col border-r-2 border-stone-200 w-full">
        <span className="text-xs text-gray-500">{title}</span>
        <input
          className="outline-none w-32 h-6 bg-transparent text-black"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  )
}

function DateContainer({ title, value, onChange }) {
  return (
    <div className="flex items-center justify-center w-28">
      <div className="flex items-center justify-center gap-2 w-full">
        <div className="flex flex-col border-r-2 border-stone-200 items-center w-full">
          <span className="text-xs text-gray-500">{title}</span>
          <input
            className="outline-none w-24 h-6 bg-transparent text-center text-black"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
        <span className="cursor-pointer">📅</span>
      </div>
    </div>
  )
}

function PassengerContainer({ value, onChange }) {
  return (
    <div className="flex items-center justify-center w-36">
      <div className="flex flex-col border-r-2 border-stone-200 items-center w-full">
        <span className="text-xs text-gray-500">Passengers/Class</span>
        <div className="flex items-center justify-center w-full">
          <input
            className="outline-none w-28 h-6 bg-transparent text-center text-black"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          <span className="w-6 h-6 cursor-pointer">▼</span>
        </div>
      </div>
    </div>
  )
}