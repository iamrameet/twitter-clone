import { html } from "./test.js";

const { div } = html([ "div" ]);


async function main(){

  const hexMap = document.getElementById("hexMap");

  let count = 0;
  let w = 71;
  for(let r = 0; r < 40; r++){
    const hexRow = div`class=${ "hex-row" }`;
    for(let h = 0; h < (r % 2 ? w : w - 1); h++){
      const hex = div`class=${ "hex" } tabindex=${ 1 }`;
      hex.addEventListener("click", function(){
        hex.classList.toggle("active");
      });
      // hex.style.animationDelay = Math.floor(Math.sin(h / 10 + 400) * Math.cos(r / 10 - 200) * h * 100) + "ms";
      // hex.style.backgroundImage = `url("https://robohash.org/img${ count++ }?size=48x48")`;
      hexRow.appendChild(hex);
    }
    hexMap.appendChild(hexRow);
  }

}

window.addEventListener("load", main, { once: true });