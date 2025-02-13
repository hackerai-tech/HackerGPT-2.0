import React, {
  FC,
  useMemo,
  useState,
  Fragment,
  useEffect,
  useRef
} from "react"
import { IconChevronDown, IconRepeat, IconWorld } from "@tabler/icons-react"
import { WithTooltip } from "./with-tooltip"
import { GPT4o } from "@/lib/models/llm/openai-llm-list"
import { SmallModel, LargeModel } from "@/lib/models/llm/hackerai-llm-list"
import { LLMID } from "@/types"
import {
  Menu,
  Transition,
  MenuItems,
  MenuButton,
  MenuItem
} from "@headlessui/react"
import { ModelIcon } from "../models/model-icon"

interface SwitchModelProps {
  currentModel: string
  onChangeModel: (model: string) => void
  isMobile: boolean
}

const getModelDisplayName = (modelId: string): string => {
  switch (modelId) {
    case GPT4o.modelId:
      return "4o"
    case SmallModel.modelId:
      return "small"
    case LargeModel.modelId:
      return "large"
    default:
      return modelId
  }
}

export const SwitchModel: FC<SwitchModelProps> = ({
  currentModel,
  onChangeModel,
  isMobile
}) => {
  const ICON_SIZE = isMobile ? 22 : 20
  const [isHovered, setIsHovered] = useState(false)
  const [shouldOpenUpward, setShouldOpenUpward] = useState(false)
  const [shouldCenter, setShouldCenter] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const calculatePosition = () => {
      if (buttonRef.current) {
        const buttonRect = buttonRef.current.getBoundingClientRect()
        const spaceBelow = window.innerHeight - buttonRect.bottom
        const spaceAbove = buttonRect.top
        const spaceRight = window.innerWidth - buttonRect.left

        setShouldOpenUpward(spaceBelow < 300 && spaceAbove > spaceBelow)
        setShouldCenter(spaceRight < 180)
      }
    }

    calculatePosition()
    window.addEventListener("resize", calculatePosition)
    return () => window.removeEventListener("resize", calculatePosition)
  }, [])

  const displayName = useMemo(
    () => getModelDisplayName(currentModel),
    [currentModel]
  )

  const shouldShowDetails = isHovered && !isMobile

  return (
    <div
      className="relative flex items-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Menu as="div" className="relative inline-block text-left">
        <WithTooltip
          delayDuration={0}
          side="bottom"
          display={<div>Switch model</div>}
          trigger={
            <MenuButton
              ref={buttonRef}
              className="relative flex cursor-pointer items-center hover:opacity-50"
            >
              <IconRepeat
                size={ICON_SIZE}
                className="cursor-pointer hover:opacity-50"
              />
              <div className="relative flex items-center">
                <span
                  className={`absolute left-full ml-1 text-sm transition-all duration-500 ${
                    shouldShowDetails
                      ? "translate-x-0 opacity-100"
                      : "-translate-x-4 opacity-0"
                  }`}
                  style={{ whiteSpace: "nowrap" }}
                >
                  {displayName}
                </span>
                <IconChevronDown
                  className={`absolute left-full transition-all duration-500 ${
                    shouldShowDetails ? "opacity-100" : "opacity-50"
                  }`}
                  size={16}
                  style={{
                    transform: `translateX(${
                      shouldShowDetails ? displayName.length * 0.4 + 0.5 : 0
                    }rem)`
                  }}
                />
              </div>
            </MenuButton>
          }
        />

        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <MenuItems
            className={`absolute ${
              shouldOpenUpward ? "bottom-full mb-2" : "top-full mt-2"
            } ${
              shouldCenter ? "left-1/2 -translate-x-1/2" : "left-0"
            } origin- min-w-[180px] whitespace-nowrap${shouldOpenUpward ? "bottom" : "top"} bg-secondary ring/5 rounded-md shadow-lg ring-1 ring-black focus:outline-none`}
          >
            <div className="p-1">
              <div className="text-muted-foreground p-2 text-sm">
                Switch model
              </div>

              {[
                { id: GPT4o.modelId, name: "PGPT-4o" },
                { id: LargeModel.modelId, name: "PGPT-Large" },
                { id: SmallModel.modelId, name: "PGPT-Small" }
              ]
                .filter(model => model.id !== currentModel)
                .map(({ id, name }) => (
                  <MenuItem key={id}>
                    {({ focus }) => (
                      <button
                        onClick={() => onChangeModel(id)}
                        className={`${
                          focus
                            ? "bg-accent text-accent-foregrounds"
                            : "text-secondary-foreground"
                        } group flex w-full items-center whitespace-nowrap rounded-sm px-3 py-2.5 text-base transition-colors`}
                      >
                        <ModelIcon
                          modelId={id as LLMID}
                          size={18}
                          className="mr-3"
                        />
                        {name}
                      </button>
                    )}
                  </MenuItem>
                ))}

              <div className="bg-muted-foreground/50 mx-2 my-1 h-px" />

              {[
                { id: GPT4o.modelId, name: "PGPT-4o" },
                { id: LargeModel.modelId, name: "PGPT-Large" },
                { id: SmallModel.modelId, name: "PGPT-Small" }
              ]
                .filter(model => model.id === currentModel)
                .map(({ id, name }) => (
                  <MenuItem key={id}>
                    {({ focus }) => (
                      <button
                        onClick={() => onChangeModel(id)}
                        className={`${
                          focus
                            ? "bg-accent text-accent-foregrounds"
                            : "text-secondary-foreground"
                        } group flex w-full items-center justify-between whitespace-nowrap rounded-sm px-3 py-2.5 text-base transition-colors`}
                      >
                        <div className="flex items-center">
                          <ModelIcon
                            modelId={id as LLMID}
                            size={18}
                            className="mr-3"
                          />
                          {name}
                        </div>
                        <IconRepeat
                          size={18}
                          className="text-muted-foreground"
                        />
                      </button>
                    )}
                  </MenuItem>
                ))}

              <MenuItem>
                {({ focus }) => (
                  <button
                    onClick={() => onChangeModel(`${currentModel}:websearch`)}
                    className={`${
                      focus
                        ? "bg-accent text-accent-foregrounds"
                        : "text-secondary-foreground"
                    } group flex w-full items-center justify-between whitespace-nowrap rounded-sm px-3 py-2.5 text-base transition-colors`}
                  >
                    <div className="flex items-center">
                      Search the web
                      <IconWorld
                        size={18}
                        className={`text-muted-foreground ml-3`}
                      />
                    </div>
                  </button>
                )}
              </MenuItem>
            </div>
          </MenuItems>
        </Transition>
      </Menu>
    </div>
  )
}
