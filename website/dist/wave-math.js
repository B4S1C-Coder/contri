// Shared by the line and every anchor: messages can never drift off their path.
export function waveY(x,time){
 return .51-.10*x+.145*Math.sin(x*Math.PI*4.2-time*.48)+.035*Math.sin(x*Math.PI*8.4-time*.48+.6);
}
