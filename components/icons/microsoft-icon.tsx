import React from "react"

interface MicrosoftIconProps extends React.SVGProps<SVGSVGElement> {
  width?: number
  height?: number
}

export const MicrosoftIcon: React.FC<MicrosoftIconProps> = ({
  width = 20,
  height = 20,
  ...props
}) => {
  return (
    <svg
      viewBox="0 0 23 23"
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      {...props}
    >
      <path fill="#f3f3f3" d="M0 0h23v23H0z" />
      <path fill="#f35325" d="M1 1h9.5v9.5H1z" />
      <path fill="#81bc06" d="M12.5 1H22v9.5h-9.5z" />
      <path fill="#05a6f0" d="M1 12.5h9.5V22H1z" />
      <path fill="#ffba08" d="M12.5 12.5H22V22h-9.5z" />
    </svg>
  )
}
