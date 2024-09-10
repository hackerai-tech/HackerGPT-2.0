import React from "react"
import { IconSearch } from "@tabler/icons-react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"

export const Header = () => (
  <div className="mb-6">
    <h1 className="text-primary mb-4 text-center text-3xl font-bold md:my-4 md:text-5xl">
      Plugins
    </h1>
    <div className="mx-auto mb-8 w-full md:max-w-xl lg:max-w-2xl">
      <p className="text-primary/70 text-center text-sm md:text-lg md:leading-tight">
        Discover custom plugins for PentestGPT that combine instructions, extra
        knowledge, and tools like terminal.
      </p>
    </div>
  </div>
)

export const SearchBar = ({
  searchTerm,
  setSearchTerm
}: {
  searchTerm: string
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>
}) => (
  <div className="mb-6 flex justify-center">
    <div className="relative w-full max-w-2xl">
      <IconSearch
        className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-500"
        aria-hidden="true"
      />
      <Input
        type="search"
        placeholder="Search plugins"
        className="z-10 h-12 w-full rounded-xl border py-2 pl-12 pr-3 text-base font-normal outline-0 delay-100 md:h-14"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
      />
    </div>
  </div>
)

export const CategorySelection = ({
  filters,
  selectedFilter,
  setSelectedFilter,
  scrollToCategory
}: {
  filters: string[]
  selectedFilter: string
  setSelectedFilter: (filter: string) => void
  scrollToCategory: (category: string) => void
}) => (
  <div className="mb-6 flex flex-wrap justify-center gap-2">
    {filters.map((filter: string) => (
      <Button
        key={filter}
        variant={selectedFilter === filter ? "default" : "outline"}
        onClick={() => {
          setSelectedFilter(filter)
          scrollToCategory(filter)
        }}
      >
        {filter}
      </Button>
    ))}
  </div>
)
