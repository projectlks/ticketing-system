
import LayoutDiv from "./LayoutDiv";


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {




  return (<>

    <section className="flex h-screen w-screen ">
      <LayoutDiv>
        {children}
      </LayoutDiv>

    </section>
  
  </>


  );
}
