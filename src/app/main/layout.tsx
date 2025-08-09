
import Aside from "@/components/Aside";
import TopBar from "@/components/TopBar";



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {




  return (<>

    <div className="flex h-screen w-screen ">
      <Aside />


      <div className="flex-1 flex flex-col max-w-[calc(100%-300px)]">
        <TopBar />

        <div className="p-4 md:p-5 overflow-y-auto h-[calc(100%-76px)]  overflow-x-auto  bg-gray-100">

          {children}
        </div>
      </div>

    </div>
    <div id="portal-root"></div>
  </>


  );
}
